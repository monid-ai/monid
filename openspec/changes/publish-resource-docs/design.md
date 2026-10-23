# Resource publishing

The publisher already stores provider and endpoint documents by their document
hash. Apply the same path and manifest fields to every entry in
`bundle.resources`. Append resource entries after endpoint entries. An absent
resources map emits no additional entries, preserving the existing resource-free
layout.

The existing function-table loop already emits resource hook functions. Resource
document entries supply the missing owner documents and their references; no new
function storage format is needed. The existing `docCount` derives from the
complete manifest list and includes resources automatically.

## Compatibility

`resource` is an additional manifest document kind. Consumers that accept only
`provider` and `endpoint` must update their validation and dispatch before
consuming the new artifacts. PR #5 proposes a shared manifest schema with that
restricted enum; it does not address resource emission. Coordinate its schema
and the hosted consumer separately. This repository's tests validate the emitted
artifacts, not the unavailable hosted ingestion implementation. Do not release
the new resource artifacts until consumer support is confirmed.

## Validation

Use a compiled synthetic bundle containing a provider, endpoint, and resource to
check the exact resource manifest entry, stored document, content-derived hash,
document count, and published lifecycle-function references. Re-emit that bundle
twice and compare complete output trees. Retain the existing resource-free
layout test.
