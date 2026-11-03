#!/usr/bin/env node
/**
 * E2E: inject a test-only EIP-1193 provider into Playwright, fund a throwaway
 * key with at most 0.001 ETH from the burner, attest via /attest/, then delete
 * the throwaway key. Never prints private keys.
 */
import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  encodeFunctionData,
} from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  ({ chromium } = require("/tmp/node_modules/playwright"));
}

const ROOT = resolve(import.meta.dirname, "..");
const BURNER_KEY_PATH = resolve(ROOT, ".secrets/burner.key");
const THROW_PATH = resolve(ROOT, ".secrets/e2e-throwaway.key");
const RPC = "https://sepolia.base.org";
const APP = "https://proof-of-vibe.pages.dev/attest/";
const FUND_ETH = "0.001";
const EAS = "0x4200000000000000000000000000000000000021";

function loadKey(path) {
  const raw = readFileSync(path, "utf8").trim();
  return (raw.startsWith("0x") ? raw : `0x${raw}`);
}

function wipe(path) {
  if (!existsSync(path)) return;
  writeFileSync(path, "0".repeat(64));
  unlinkSync(path);
}

const result = {
  ok: false,
  fundedEth: FUND_ETH,
  throwawayAddress: null,
  txHash: null,
  attestationHint: null,
  error: null,
};

let throwKey = null;
try {
  mkdirSync(resolve(ROOT, ".secrets"), { recursive: true, mode: 0o700 });
  throwKey = generatePrivateKey();
  writeFileSync(THROW_PATH, throwKey + "\n", { mode: 0o600 });

  const burnerKey = loadKey(BURNER_KEY_PATH);
  const burner = privateKeyToAccount(burnerKey);
  const throwAcc = privateKeyToAccount(throwKey);
  result.throwawayAddress = throwAcc.address;

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC),
  });
  const burnerWallet = createWalletClient({
    account: burner,
    chain: baseSepolia,
    transport: http(RPC),
  });

  const fundHash = await burnerWallet.sendTransaction({
    account: burner,
    chain: baseSepolia,
    to: throwAcc.address,
    value: parseEther(FUND_ETH),
  });
  await publicClient.waitForTransactionReceipt({ hash: fundHash });
  const bal = await publicClient.getBalance({ address: throwAcc.address });
  if (bal < parseEther("0.0005")) {
    throw new Error(`Throwaway underfunded: ${formatEther(bal)} ETH`);
  }

  const throwWallet = createWalletClient({
    account: throwAcc,
    chain: baseSepolia,
    transport: http(RPC),
  });

  async function nodeRpc(method, params = []) {
    if (method === "eth_requestAccounts" || method === "eth_accounts") {
      return [throwAcc.address];
    }
    if (method === "eth_chainId") return "0x14a34";
    if (method === "net_version") return "84532";
    if (method === "wallet_switchEthereumChain" || method === "wallet_addEthereumChain") {
      return null;
    }
    if (method === "eth_sendTransaction") {
      const tx = params[0] || {};
      const hash = await throwWallet.sendTransaction({
        account: throwAcc,
        chain: baseSepolia,
        to: tx.to,
        data: tx.data,
        value: tx.value ? BigInt(tx.value) : 0n,
        gas: tx.gas ? BigInt(tx.gas) : undefined,
      });
      return hash;
    }
    if (method === "personal_sign" || method === "eth_sign") {
      throw new Error(`${method} not needed for attest E2E`);
    }
    // Forward everything else to public RPC
    const res = await fetch(RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    const body = await res.json();
    if (body.error) throw new Error(JSON.stringify(body.error));
    return body.result;
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.exposeFunction("__povEip1193", async (payload) => {
    const { method, params } = payload;
    return nodeRpc(method, params || []);
  });
  await page.addInitScript(() => {
    const provider = {
      isMetaMask: true,
      request: async ({ method, params }) =>
        window.__povEip1193({ method, params }),
      on() {},
      removeListener() {},
    };
    window.ethereum = provider;
  });

  await page.goto(APP, { waitUntil: "networkidle", timeout: 60000 });
  await page.click("button:has-text('Connect wallet')");
  await page.waitForTimeout(1500);
  const connected = await page.locator("text=Wallet connected").count();
  if (!connected) {
    // status line may show Connected 0x...
    const main = await page.locator("main").innerText();
    if (!/Connected 0x/i.test(main) && !/Wallet connected/i.test(main)) {
      throw new Error("Connect wallet did not show connected state: " + main.slice(0, 400));
    }
  }

  await page.fill("#att-repo", "ajocircle-dev/proof-of-vibe");
  await page.click("button:has-text('Load latest commit')");
  await page.waitForTimeout(2500);
  await page.fill("#att-builder", "e2e-bot");
  await page.fill("#att-agent", "10554");
  await page.fill("#att-tool", "Playwright");

  await page.click("button:has-text('Attest this commit')");
  // Wait for success or error (up to ~90s for chain)
  const deadline = Date.now() + 90000;
  let done = false;
  while (Date.now() < deadline) {
    const text = await page.locator("main").innerText();
    if (/Attestation submitted|Done\. After easscan/i.test(text)) {
      done = true;
      const m = text.match(/Tx:\s*\n?\s*basescan/i);
      const href = await page.locator('a[href*="sepolia.basescan.org/tx/"]').first().getAttribute("href").catch(() => null);
      if (href) result.txHash = href.split("/tx/")[1];
      break;
    }
    if (/role="alert"|Could not|Error|reverted|insufficient/i.test(text) && /Waiting for wallet/i.test(text) === false) {
      // check alert specifically
      const alert = page.locator('[role="alert"]');
      if (await alert.count()) {
        const err = await alert.innerText();
        if (err.trim()) throw new Error(err.trim());
      }
    }
    await page.waitForTimeout(1500);
  }
  if (!done) {
    const text = await page.locator("main").innerText();
    throw new Error("Timed out waiting for attest success: " + text.slice(0, 600));
  }

  if (result.txHash) {
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: result.txHash,
    });
    // EAS Attested event often first data word = uid
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() === EAS.toLowerCase() && log.data && log.data.length >= 66) {
        result.attestationHint = `0x${log.data.slice(2, 66)}`;
        break;
      }
    }
  }

  result.ok = true;
  await browser.close();

  // Sweep leftover dust back to burner (best effort)
  try {
    const left = await publicClient.getBalance({ address: throwAcc.address });
    if (left > parseEther("0.00005")) {
      const gasPrice = await publicClient.getGasPrice();
      const gas = 21000n;
      const cost = gas * gasPrice * 12n / 10n;
      if (left > cost) {
        await throwWallet.sendTransaction({
          account: throwAcc,
          chain: baseSepolia,
          to: burner.address,
          value: left - cost,
          gas,
        });
      }
    }
  } catch {
    /* ignore sweep errors */
  }
} catch (e) {
  result.ok = false;
  result.error = e instanceof Error ? e.message : String(e);
} finally {
  wipe(THROW_PATH);
  throwKey = null;
}

// Print summary without keys
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
