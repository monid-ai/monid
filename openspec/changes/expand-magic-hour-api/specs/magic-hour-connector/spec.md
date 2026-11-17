## ADDED Requirements

### Requirement: Current public operation coverage
Every operation in Magic Hour public OpenAPI at docs commit `2e0bbe9261078e87124341ac7e479b38655bf8a6` SHALL have a discoverable endpoint. This includes 42 operations, with UGC ads, video upscaling and music generation. Existing GIF identity SHALL remain stable. DELETE operations SHALL use a separate /delete catalog identity while issuing DELETE to the native project path.

### Requirement: Faithful input capabilities
Input schemas SHALL preserve documented fields, nested requiredness, enums and single-field limits. Where account-dependent defaults prevent a deterministic estimate, explicit model/resolution selectors SHALL be required at the endpoint binding. Cross-field and plan-specific constraints that cannot survive JSON Schema compilation SHALL be stated in notes and remain enforced by Magic Hour. Unsupported model/price claims SHALL NOT be invented.

### Requirement: Async generation and utility isolation
Generation SHALL submit once and poll its accepted ID in the explicit matching image/video/audio/face-detection collection. Unknown create routes SHALL fail before submission. Ambiguous paid acceptance SHALL NOT trigger an automatic second create in this connector. New generation running states SHALL preserve the accepted ID and collection. Historical GIF states without a collection SHALL resolve the image collection from the original request. Account, saved-item, upload, project read and delete operations SHALL return directly and SHALL NOT rebill historical credits_charged. The original GIF no-download error contract remains unchanged; expanded generation with missing downloads SHALL preserve its accepted ID for reconciliation rather than falsely report a free successful result.

### Requirement: Admission and settlement limits
Credit estimates SHALL follow current first-party API charging sources, with explicit selections where necessary. Successful terminal credits_charged SHALL be the vendor meter used for settlement. Hosted timeout, unknown acceptance, credential isolation, destructive authorization and billing recovery SHALL remain explicit Monid-owned verification gates. Source compilation, replay checks and a merged PR SHALL NOT be represented as hosted publication or delivered media proof.
