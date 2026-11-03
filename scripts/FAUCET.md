# Base Sepolia funding (no-account only)

Burner address is in `.secrets/burner.address` (never commit the key).

Allowed:
- Browser PoW faucets that need no login and no card
- Other public drips that need no Coinbase CDP account and no payment method

Not allowed without the user:
- Coinbase CDP sign-up
- Adding a card
- Spending real funds
- Mainnet

If every no-account faucet fails, keep building against a local `anvil` fork of Base Sepolia and leave the burner address in the report.
