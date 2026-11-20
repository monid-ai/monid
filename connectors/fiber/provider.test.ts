import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import {
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const HERE = fromFileUrl(new URL("./", import.meta.url));

/**
 * Fiber's draw per endpoint on its happy chain — Fiber's platform-default
 * card (`OperationPricingV2Schema`, fiber-ai/common 2026-11: 100
 * centi-credits = 1 credit): live profile / company fetch 2 per call,
 * reverse email lookup 2 per hit, lite reveal 1 per email type + 2 per
 * phone, kitchen-sink company 2 per company, kitchen-sink person 2 per
 * person (+2 per live fetch). On every happy chain the vendor's
 * `chargeInfo.creditsCharged` claim equals the fold, so no `mismatch` key
 * appears (zUsage is strict; deep equality proves it). Written as
 * LITERALS on purpose (clay D7a): deriving them from each doc's own model
 * would make this test a tautology. A new endpoint must state its row
 * here.
 */
const RATE: Record<
    string,
    { dir: string; fixture: string; input: RunInput; usage: Json }
> = {
    "fiber#linkedin-live-fetch/profile/single": {
        dir: "linkedin-live-fetch-profile",
        fixture: "synthetic-happy",
        input: { body: { identifier: "williamhgates" } },
        usage: { credits: { default: 2 }, evidence: { CALL: 1 } },
    },
    "fiber#linkedin-live-fetch/company/single": {
        dir: "linkedin-live-fetch-company",
        fixture: "synthetic-happy",
        input: { body: { type: "slug", value: "microsoft" } },
        usage: { credits: { default: 2 }, evidence: { CALL: 1 } },
    },
    "fiber#email-to-person/single": {
        dir: "email-to-person",
        fixture: "synthetic-happy",
        input: { body: { email: "bill.gates@example.org" } },
        usage: { credits: { default: 2 }, evidence: { RESULT: 1 } },
    },
    "fiber#contact-details/lite": {
        dir: "contact-details-lite",
        fixture: "synthetic-all-found",
        input: {
            body: {
                input: {
                    mode: "linkedin",
                    linkedinIdentifier: "williamhgates",
                },
                enrichmentType: {
                    getWorkEmails: true,
                    getPersonalEmails: true,
                    getPhoneNumbers: true,
                },
            },
        },
        usage: { credits: { default: 4 }, evidence: { email: 2, phone: 1 } },
    },
    "fiber#kitchen-sink/company": {
        dir: "kitchen-sink-company",
        fixture: "synthetic-happy",
        input: { body: { companyName: { value: "Stripe" }, numCompanies: 3 } },
        usage: { credits: { default: 4 }, evidence: { RESULT: 2 } },
    },
    "fiber#kitchen-sink/person": {
        dir: "kitchen-sink-person",
        fixture: "synthetic-live-fetch",
        input: {
            body: {
                profileIdentifier: {
                    identifier: "linkedinSlug",
                    value: "williamhgates",
                },
                liveFetch: true,
            },
        },
        usage: {
            credits: { default: 4 },
            evidence: { lookup: 1, live_fetch: 1 },
        },
    },
};

Deno.test("fiber: the rate table covers exactly the compiled endpoints", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("fiber#")).sort();
    assertEquals(ids, Object.keys(RATE).sort());
});

for (const [id, row] of Object.entries(RATE)) {
    Deno.test(`${id}: happy run settles its rate-table row, receipt stripped`, async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: row.input,
            mode: "replay",
            fixture: await loadFixture(
                `${HERE}endpoints/${row.dir}/fixtures/${row.fixture}.json`,
            ),
        });
        assertEquals(result.httpStatus, 200);
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage, row.usage);
        // chargeInfo is a receipt (and lowCreditAlert reports OUR shared
        // account's balance): it never reaches the caller
        const output = result.output as Record<string, unknown>;
        assert(!("chargeInfo" in output));
        assert("output" in output);
    });
}

Deno.test("fiber: one auth fn, one consolidate fn, one fromError fn across all six docs", async () => {
    const bundle = await testBundle();
    const docs = Object.entries(bundle.endpoints)
        .filter(([id]) => id.startsWith("fiber#")).map(([, doc]) => doc);
    const keys = (pick: (d: typeof docs[number]) => string | undefined) =>
        new Set(docs.map(pick));
    assertEquals(keys((d) => d.auth.inject.$fn.key).size, 1);
    assertEquals(keys((d) => d.usage.consolidate?.$fn.key).size, 1);
    assertEquals(keys((d) => d.output.fromError?.$fn.key).size, 1);
    for (const doc of docs) {
        assertEquals(
            doc.request.url.startsWith("https://api.fiber.ai/v1/"),
            true,
        );
        assertEquals(doc.request.method, "POST");
    }
});
