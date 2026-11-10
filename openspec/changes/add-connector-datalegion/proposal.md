# Add Data Legion enrichment variants

Add four person and two company enrichment variants matching the supplied
credential labels. Each variant has a unique Monid identity but calls one of
two native POST routes. No engine or schema-contract changes are required.
Reuse the existing Data Legion provider and shared native input schemas.

Pricing follows the user-provided Pay-As-You-Go contract: six USD rates per
successful matched call (0.013/0.065/0.052/0.104/0.013/0.052), one dollar-denominated
default credit system. Settlement counts 0/1 matched outcomes, never profile count;
empty 200 responses and non-2xx errors cost zero. Live billing remains unverified.
No search/discovery access is inferred from enrichment credentials.
