# Design: Marx Connector

## Provider
- Slug: `marx`
- Display Name: Marx
- Website: https://marx.finance

## Endpoints
- `market-sentiment`: Calls `GET https://marx.finance/api/ticker-sentiment?ticker=<ticker>`.
  - Public calls receive consensus sentiment and active thesis references.
  - Optional `x-api-key` header unlocks full quantitative conviction scores (0-100) and 24h momentum deltas.
