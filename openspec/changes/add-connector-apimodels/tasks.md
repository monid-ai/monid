# Tasks: add-connector-apimodels

## 1. Connector

- [x] 1.1 Add provider metadata, Bearer auth, task create/poll lifecycle and receipt settlement
- [x] 1.2 Add the three image endpoints with per-tier rate cards
- [x] 1.3 Add the three video endpoints with flat and per-second rate cards
- [x] 1.4 Register the six endpoint ids in `connectors/ids.lock.json`

## 2. Fixtures and tests

- [x] 2.1 Record one image task and one video task against the live API
- [x] 2.2 Add synthetic failure chains in the recorded shape
- [x] 2.3 Add replay tests, estimate tests, wire-body tests and live tests

## 3. Specification and verification

- [x] 3.1 Add the OpenSpec proposal and connector requirements
- [x] 3.2 Run formatting, lint, type checks, tests and compilation
