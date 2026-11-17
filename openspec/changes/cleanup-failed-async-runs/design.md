# Design

Catch failures only around sleep and poll after a RUNNING result. Pass the last successful state and stable run handle to stop. Retain the original error even when stop cannot settle or throws. Do not retry submission or polling automatically: either can repeat provider effects. Timeout handling already stops the job and stays outside this catch. No schema or hook ABI changes are needed. Cleanup remains best effort; vendor cancellation can fail, and direct phase API users remain responsible for orchestration.
