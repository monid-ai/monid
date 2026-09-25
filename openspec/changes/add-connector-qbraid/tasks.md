# Tasks: add-connector-qbraid

## 1. Decisions (qBraid, 2026-09-22)

- [x] 1.1 Surface = the 13 routes safe under a platform-held key (D2)
- [x] 1.2 Pool = qBraid credits, 100 = $1; only `submit-job` bills (D3)
- [x] 1.3 A 201 with `success: false` settles as a 502 provider error (D4)

## 2. Provider

- [x] 2.1 `categories.ts`: new leaf `quantum-computing`
- [x] 2.2 `schema/qasm.ts` (`zQasmBody`), `schema/qrn.ts` (device and job
      QRN path params)
- [x] 2.3 `provider.ts`: meta + 2 notes, `X-API-Key` header preset, the
      api-v2 host, timeouts 30 s / 60 s, FREE default model, the credits
      pool, `fromError` for `{success: false, message, error}` (D5)

## 3. Endpoints (13)

- [x] 3.1 `list-devices`, `get-device`, `get-device-calibration`,
      `list-providers` — FREE
- [x] 3.2 `validate-qasm`, `parse-qasm`, `convert-qasm`,
      `simulate-circuit` — FREE, 60 s / 90 s (D7)
- [x] 3.3 `estimate-job-cost` — FREE, the pre-run quote
- [x] 3.4 `submit-job` — PER_UNIT·CREDIT at 0.000001, claim + strip on
      `data.estimatedCost`, empty estimate, `lifecycle.start` (D3, D4)
- [x] 3.5 `get-job`, `get-job-result`, `cancel-job` — FREE

## 4. Verify

- [x] 4.1 `compiler:compile` — 13 docs; `catalog inspect
      'qbraid#submit-job'` renders
- [x] 4.2 `provider.test.ts`: literal rate table whose key set equals the
      ids; every happy run settles its row; provenance (one inject, one
      fromError, one pool; only submit-job meters, consolidates and runs a
      lifecycle)
- [x] 4.3 Thirteen `endpoint.test.ts`: happy, provider error, schema gates
      with near twins, live gated on `QBRAID_CREDENTIALS_API_KEY`;
      submit-job's priced, rejected-201 and unknown-device chains
- [x] 4.4 Live run 2026-09-22: 13/13 live gates pass, free-simulator
      submit settles 0 credits
- [x] 4.5 `ids.lock.json`: the 13 `qbraid#…` ids only, against main
- [x] 4.6 check · test · compile

## 7. Follow-ups (not in this change)

- [ ] 7.1 Observe one paid QPU submit and replace
      `submit-job/synthetic-priced.json` with the recording
- [ ] 7.2 Record a cancel on a long-queued job and replace
      `cancel-job/synthetic-happy.json`
- [ ] 7.3 Scope the program read-back routes (`/jobs/{qrn}/program`,
      `/compiled-program`, `/program/ascii`)
