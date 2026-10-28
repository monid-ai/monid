# Data Legion enrichment

- Four person variants MUST call POST /person/enrich; two company variants MUST
  call POST /company/enrich, each with a unique Monid endpoint id.
- Each variant MUST validate and inject only its own credential into API-Key.
- Native limit MUST remain optional and restricted to 1..10 when supplied.
- Estimates MUST reserve one call's contract USD rate, regardless of limit.
- Contract rates MUST be 0.013, 0.065, 0.052, 0.104 USD for the four person
  variants, and 0.013, 0.052 USD for company Base and Premium respectively.
- A successful response with one or more matches MUST charge exactly once.
  Empty matches and non-2xx responses MUST consume zero dollars.
- Provider MUST declare one default USD credit system. RESULT evidence MUST be
  binary, indicating whether this request produced a successful matched outcome.
- Offline tests MUST distinguish one match from multiple matches, confirm both
  cost the same, and cover empty 200, 404, 403, auth, schema and estimates.
- Live tests MUST skip without the corresponding credential.
