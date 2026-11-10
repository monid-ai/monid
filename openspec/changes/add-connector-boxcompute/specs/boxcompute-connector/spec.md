# boxcompute-connector (delta)

## ADDED Requirements

### Requirement: BoxCompute provider definition
The boxcompute provider SHALL declare name `boxcompute`, `request.baseUrl`
`https://app.boxcompute.ai`, auth `presets.auth.bearer()`, no endpoint
credit pool (every call is FREE), and an `output.fromResponse` that omits
`workspaceId`, `metadata` and `createdByApiKeyId` from every success output.

#### Scenario: Pool internals never reach a user
- **WHEN** any endpoint returns a VM record
- **THEN** the output has no `workspaceId`, `metadata` or
  `createdByApiKeyId`

### Requirement: VMs are owned resources
The provider SHALL declare the resource `boxcompute/vm`. Every endpoint
that names a `sandboxId` SHALL bind it with READS, USES or RELEASES at
`$.body.sandboxId`. `list-sandboxes` SHALL read only `utils.resources`.

#### Scenario: A foreign VM
- **WHEN** an endpoint names a `sandboxId` the workspace does not own
- **THEN** the run answers the uniform 404 with zero usage, and no
  upstream call is made

#### Scenario: Listing
- **WHEN** `boxcompute#list-sandboxes` runs
- **THEN** it returns `{sandboxId, size, name?, blockNetwork, syncedAt?}`
  for each owned row, and never calls `GET /api/v2/sandboxes`

### Requirement: Creating a VM provisions it whenever it exists
`boxcompute#create-sandbox` SHALL create the VM in the account's oldest
workspace with `Idempotency-Key: {runId}:create`. It SHALL then read the VM
every 5 s for at most 100 s.

#### Scenario: The VM runs
- **WHEN** a read shows `running`
- **THEN** the run answers 201 and seeds `boxcompute/vm` with the VM's id,
  size, name and network

#### Scenario: The VM is still booting
- **WHEN** every read shows `pending`
- **THEN** the run answers 202 and still seeds the resource

#### Scenario: The VM is refused
- **WHEN** a read shows `expired`
- **THEN** the run deletes the VM (best effort) and answers 429
  `SANDBOX_REFUSED` with nothing provisioned

### Requirement: Deleting a VM is immediate
`boxcompute#delete-sandbox` SHALL send `DELETE /api/v2/sandboxes/{id}` in
its `lifecycle.start`. It SHALL answer 200 `{sandboxId, status: "deleted"}`
with the release mark when the delete succeeds or the VM is already gone
(404), and SHALL relay any other answer without the mark.

#### Scenario: Already gone
- **WHEN** the DELETE answers 404
- **THEN** the run answers 200 and emits `releases` for the VM

#### Scenario: Busy
- **WHEN** the DELETE answers 409
- **THEN** the 409 is relayed and no release mark is emitted

### Requirement: The compute line is reconciled from BoxCompute's costs
`reconcileUsage.compute` SHALL sum, over the window, each settled run's
`amountMicros` and each running estimate's `estimatedMicros`, each scaled
by the share of its time inside the window. It SHALL fall back to the
deleted-VM history after a 404, and SHALL throw on a truncated history or
`estimates: "unavailable"`.

#### Scenario: Runs straddling the window
- **WHEN** a run lies half inside the window, another wholly inside, a
  third outside, and a running estimate half inside
- **THEN** the reading is half, all, none and half of their amounts

#### Scenario: A deleted VM
- **WHEN** the live cost read answers 404
- **THEN** the reconciler finds the `dsb_…` history whose `sandboxId` is
  the VM's id and reads that history's costs

#### Scenario: A doubtful read
- **WHEN** the history is truncated or the running estimate is
  unavailable
- **THEN** the reconciler throws and no reading is returned
