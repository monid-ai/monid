# Design: remove-cloro-copilot-perplexity

## D1. Remove the endpoints, do not mark them unavailable

The schema has no "unavailable" state for an endpoint. A note in
`meta.notes` would keep an endpoint in the catalog that fails on every call.
cloro gives no date for a return, so the endpoints are removed. If cloro
supports the products again, a new change adds them back.

## D2. Edit ids.lock.json by hand

`deno task ids:check --update` generates `connectors/ids.lock.json`. On
main the lock already differs from the registry for other connectors (the
add-connector-openai change records 78 unregistered and 7 obsolete ids).
`--update` would put that unrelated difference in this change. Thus this
change removes only the two cloro lines, in the same format, as the
add-connector-openai change registered only its own identities.

## D3. Shared estimate interning

add-connector-cloro required that the three assistant endpoints whose only
add-on is state targeting share one estimate entry. After this change only
Gemini has that shape, so the requirement has nothing to compare and is
removed.
