## ADDED Requirements

### Requirement: Publish every resource document

The split catalog publisher SHALL emit every compiled resource document as a
content-addressed object and list it in `manifest.docs` with `kind: "resource"`,
its resource ID, provider, document hash, and object key. The returned document
count SHALL include resource documents. Referenced hook functions SHALL remain
available through the published function table.

#### Scenario: A bundle contains a resource

- **GIVEN** a compiled bundle containing `demo/widget`
- **WHEN** the split publish tree is emitted
- **THEN** the manifest contains exactly one resource entry for `demo/widget`
- **AND** its object key resolves to the complete compiled resource document
- **AND** the object's document hash matches the manifest hash
- **AND** its lifecycle function references resolve through the published fn
  list

#### Scenario: Resource publication is deterministic

- **GIVEN** the same resource-bearing bundle and catalog tag
- **WHEN** the publisher emits two output trees
- **THEN** every relative file path and file's content is identical

#### Scenario: A bundle contains no resources

- **GIVEN** a compiled bundle without resources
- **WHEN** the split publish tree is emitted
- **THEN** its provider and endpoint publication behavior is preserved
