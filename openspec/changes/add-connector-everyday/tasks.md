# Tasks: add-connector-everyday

## 1. Provider and shared schemas

- [x] 1.1 Add provider metadata, shared MCP request headers, explicit empty
      credentials with an unchanged-request injector, FREE usage, and the
      in-band MCP failure lifecycle.
- [x] 1.2 Add the `utility` category leaf.
- [x] 1.3 Mirror shared kitchen units, ingredients, targets, and structured
      output schemas from the source Everyday MCP.

## 2. Endpoints

- [x] 2.1 Add `everyday#unit-convert` with all ten dimensions and fixed
      `unit_convert` MCP mapping.
- [x] 2.2 Add `everyday#recipe-scale` with fixed `recipe_scale` action and
      upstream-only rational/byte-size validation documented in notes.
- [x] 2.3 Add `everyday#shopping-merge` with fixed `shopping_merge` action and
      compatible kitchen target units.

## 3. Fixtures and tests

- [x] 3.1 Add three minimal synthetic happy fixtures.
- [x] 3.2 Run compiled sealed units with an empty-parameter custom transport;
      assert no Authorization header and capture complete MCP headers/bodies.
- [x] 3.3 Cover happy results, FREE usage, identities, schema rejection,
      cross-dimension rejection, upstream rational errors, HTTP 429,
      JSON-RPC errors, MCP `isError`, malformed success envelopes, output
      contract rejection, and recipe-to-shopping value carryover.
- [x] 3.4 Run three anonymous live maintenance calls with explicit network
      opt-in; hosted Monid discovery/run remains outside this connector change.

## 4. Wiring and verification

- [x] 4.1 Update `connectors/ids.lock.json` through `ids:check --update` and
      confirm only the three Everyday ids were added.
- [x] 4.2 Run formatter, connector checks/tests, full `check`/`test`, and
      deterministic/frozen compile verification.
- [ ] 4.3 Obtain a clean ids guard. The fixed base tree already reports 85
      unrelated `+`/`-` drift lines; the feature tree reports the same set,
      while this change adds only the three Everyday lock entries.
