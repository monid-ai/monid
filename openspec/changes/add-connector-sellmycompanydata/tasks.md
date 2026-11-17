# Tasks: add-connector-sellmycompanydata

## 1. Provider

- [x] 1.1 provider.ts: baseUrl, MCP headers, keyless auth (empty credentials
      + identity inject), timeouts 15/20 s, FREE model, meta + notes
- [x] 1.2 lifecycle.start: lift JSON-RPC errors, `isError` results and
      malformed or mismatched-id envelopes to a synthesized 422
- [x] 1.3 output: `structuredContent` on success, `{ message, code?, raw }`
      on provider errors

## 2. Endpoints (2)

- [x] 2.1 assessment-checklist: no input schema, pinned
      `assessment_checklist` call with `arguments: {}`
- [x] 2.2 estimate-data-value: strict mirror of the published inputSchema,
      pinned `estimate_data_value` call, `next_step` pointed at
      `estimate_url`
- [x] 2.3 ids.lock.json: the two ids (only these)

## 3. Fixtures + tests

- [x] 3.1 Four fixtures recorded 2026-10-29 from the public server (made-up
      figures, no personal data, no headers)
- [x] 3.2 provider.test.ts: the compiled shape, once per provider (2 ids,
      url, headers, keyless, FREE, shared envelope fns)
- [x] 3.3 One endpoint.test.ts per endpoint, helpers in test-support.ts:
      zero estimate, recorded request bodies equal the sent bodies,
      verbatim replays, provider errors at zero usage (the in-band refusal,
      JSON-RPC / HTTP / malformed envelopes, a non-JSON 500), the schema
      gate with passing near-twins (the checklist pins that it takes no
      input), pinned egress, live runs gated on `SELLMYCOMPANYDATA_LIVE=1`

## 4. Verify

- [x] 4.1 deno fmt and deno lint on the connector
- [x] 4.2 deno task check and deno task test in CI
