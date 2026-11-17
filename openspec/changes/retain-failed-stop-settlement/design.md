# Design

A failed settlement of a COMPLETED stop outcome SHALL return UNRESOLVED with the previous state, regardless of estimate cadence. A successful settlement SHALL remain COMPLETED.

The change uses existing result shapes and requires no ABI or document-format change. It restores the ownership/settlement contract.
Track entry into completed settlement separately from the existing cadence failure rule. Preserve the previous state for host reconciliation; do not fabricate usage or return partial settlement. Void stop and non-cadenced failures before a completed outcome retain their existing behavior.
