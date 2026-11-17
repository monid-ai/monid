# Scrapeless connector requirements

## Scope and discovery

One provider SHALL expose 22 stable business endpoints: Google Search API (6),
AI Scraper (8), Web Unlocker (1), Amazon Scraper (4), TikTok Scraper (3).
Metadata SHALL explain the task, inputs, returned data and operational behavior.
Schemas SHALL retain vendor meanings and enforce binding constraints in compiled
JSON Schema. Native fields, citations, pagination fields and task IDs SHALL be
preserved under provider_response.

## Execution

Google Search SHALL distinguish HTTP 200 final data from HTTP 201 task creation.
AI SHALL handle pending/running/success/failed and expired results, accounting
for documented four-minute result retention. A submission SHALL NOT be blindly
repeated after an ambiguous transport failure. Polls SHALL use the original
identifier with bounded retries and total runtime. Known AI Mode short links
SHALL resolve through bounded allowlisted credential-free reads before one POST.

## Metering

Every endpoint SHALL declare its standard USD rate. TikTok's three operations
SHALL use the owner-confirmed USD 0.003/request rate. Eligible AI shopping
results SHALL count at most one extra base charge, not a charge per product.
Shopping estimates SHALL cover the possible successful settlement. ChatGPT
SHALL reserve the enrichment ceiling even with shopping=false, while final
settlement SHALL still depend on nonempty returned product data.
Internal polls SHALL NOT become new business submissions. Supplier account
charging and Monid error settlement SHALL remain distinct; errors SHALL retain
real status and context.

## Validation and delivery

Each endpoint SHALL have representative recorded native-success evidence and
compiled replay tests. Synthetic cases SHALL be identified. Fixtures SHALL
exclude credentials and retain the request sequence. Required offline type
checks and tests SHALL pass. No engine/ABI change or generated catalog is part
of this connector change. PR review, merge and production acceptance SHALL be
recorded separately.
