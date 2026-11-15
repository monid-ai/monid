# Clean up failed async runs

A polling or sleep failure currently abandons an already submitted job. Attempt best-effort stop with the last known state before propagating the original error.
