# Include resource documents in published catalogs

## Why

The compiled bundle contains resource documents, but the split publisher writes
only provider and endpoint documents. A published catalog therefore loses the
resource definitions referenced by its endpoints, including their rate cards and
lifecycle contracts.

## What changes

- Emit each resource document as a content-addressed object.
- Add a `kind: "resource"` manifest entry with its ID, provider, hash, and key.
- Count resource documents in the publish result.
- Cover resource payloads, function references, and deterministic re-emission.

## Impact

This changes the publish manifest's document-kind vocabulary. Downstream
manifest validation and ingestion must support resource entries before a catalog
containing them is released. The proposed shared publish contract in PR #5
currently lists only provider and endpoint kinds and needs a coordinated update.
