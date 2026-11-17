# Design

Keyed ownership gates SHALL require a row whose resource and externalId both equal the target. A nonmatching result SHALL produce the existing uniform 404 before upstream IO.

The change uses existing result shapes and requires no ABI or document-format change. It restores the ownership/settlement contract.
Reader row schema validation and keyless enumeration remain separate concerns.
