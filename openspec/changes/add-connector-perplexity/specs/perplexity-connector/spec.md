# Perplexity connector requirements

## Transport and identity

The compiled endpoint SHALL be `perplexity#search`, with JSON POST requests
to `https://api.perplexity.ai/search`, Bearer authentication injected only by
the transport, and static Monid integration identity headers.

## Inputs

The input SHALL expose the documented Search request fields and bounds.
Optional fields SHALL remain optional without forced context defaults.
Token budgets SHALL pass through without an injected `search_context_size`.
Caller-supplied incompatible context/budget pairs, web/people result-limit
combinations, and invalid calendar dates SHALL remain subject to upstream
validation; notes SHALL disclose those rules. Notes SHALL advise using one
domain mode only without promising upstream rejection of mixed modes.
People requests SHALL omit `search_context_size` in supported examples;
explicit caller values SHALL pass through unchanged with the observed 400
behavior disclosed.

The API reference is the source for the 20-language limit, with the conflicting
quickstart guidance explicitly tracked. Live checks accepted 10, 11 and 20
distinct codes. This establishes acceptance, not exhaustive semantic parity.
([Reference](https://docs.perplexity.ai/api-reference/search-post),
[Quickstart](https://docs.perplexity.ai/docs/search/quickstart))

## Billing and output

Successful HTTP calls SHALL settle one flat $0.005 charge, including empty
results and up to five queries. Non-2xx provider responses SHALL be returned
with zero connector usage. Native response/error bodies SHALL pass through.
Network/abort failures SHALL remain execution errors, not successful zero-cost
results. No automatic retries SHALL be added.

## Validation

Tests SHALL execute the compiled sealed unit, not only the authoring Zod schema.
Captured-wire tests SHALL verify request body, auth and attribution headers.
Synthetic fixtures SHALL be labeled as synthetic and contain no credentials.
Live tests SHALL require deliberate opt-in and SHALL not run in default checks.
