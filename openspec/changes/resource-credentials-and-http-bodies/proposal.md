# Add resource-scoped credential custody and HTTP fidelity

Support connectors for existing customer accounts and new account provisioning
through ordinary resource definitions. Extend the shared transport to capture
issued credentials before engine ingress, resolve owned references at egress,
and preserve multipart requests, declared headers, and binary responses.

Ambiguous is the proving connector. Replace its standalone connection manager and
CLI with ordinary provision/read/release endpoints and the existing host loop.
Generate its whole advertised agent catalog and verify the inventory against the
pinned public contract. Hosted Relay implements the generic credential-store port;
the public repository includes a runnable local implementation and conformance tests.
