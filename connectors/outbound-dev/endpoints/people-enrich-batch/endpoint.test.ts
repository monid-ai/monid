import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "outbound-dev#people/enrich/batch";
const ANA = { linkedinUrl: "https://www.linkedin.com/in/ana-ruiz-ops" };
const RAFAEL = {
    fullName: "Rafael Ortiz",
    companyDomain: "halden-freight.example",
};
const TWO_PEOPLE: Json = {
    people: [ANA, RAFAEL],
    find: "email_and_phone",
    providers: "waterfall",
};
const NOTHING = {
    email_found_package: 0,
    email_found_waterfall: 0,
    phone_found_package: 0,
    phone_found_waterfall: 0,
};

const run = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("outbound-dev#people/enrich/batch: a finished job settles the $0.12 it was charged", async () => {
    const result = await run(
        "synthetic-enrich-batch-succeeded.json",
        TWO_PEOPLE,
    );
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // An email from the package ($0.02) and a phone from the waterfall
    // ($0.10): the job's own `chargedUsd` and the fold over `units` agree.
    assertEquals(result.usage, {
        credits: { default: 0.12 },
        evidence: {
            ...NOTHING,
            email_found_package: 1,
            phone_found_waterfall: 1,
        },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.status, "succeeded");
    assertEquals("chargedUsd" in output, false);
    const results = output.results as Record<string, unknown>[];
    assertEquals(results.map((person) => person.index), [0, 1]);
    assertEquals(results.some((person) => "personId" in person), false);
    assertEquals(results[1].found, {});
});

Deno.test("outbound-dev#people/enrich/batch: a failed job settles what it found before it failed", async () => {
    const result = await run("synthetic-enrich-batch-failed.json", {
        people: [ANA, RAFAEL],
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 0.02 },
        evidence: { ...NOTHING, email_found_package: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.status, "failed");
    const results = output.results as Record<string, Record<string, unknown>>[];
    assertEquals(results[1].error.code, "enrichment_not_run");
});

Deno.test("outbound-dev#people/enrich/batch: a job ended at no charge bills nothing, whatever units it still lists", async () => {
    // outbound.dev released the hold: `chargedUsd` is zero while `units`
    // still shows three emails from the last progress read. A zero claim is
    // pruned, so the evidence itself must count nothing.
    const result = await run("synthetic-enrich-batch-released.json", {
        people: [ANA, RAFAEL, { lastName: "Costa", companyName: "Halden" }],
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: NOTHING });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.status, "failed");
    assertEquals("results" in output, false);
});

Deno.test("outbound-dev#people/enrich/batch: a failed read holds the run open, and a zero charge settles zero", async () => {
    // 429 then 503 on the read: the job kept running, so the run did too.
    const result = await run("synthetic-enrich-batch-transient.json", {
        people: [RAFAEL],
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: NOTHING });
    assertEquals(
        (result.output as Record<string, unknown>).status,
        "succeeded",
    );
});

Deno.test("outbound-dev#people/enrich/batch: a refused submit is zero-billed data", async () => {
    const result = await run("synthetic-insufficient-balance.json", TWO_PEOPLE);
    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, unknown>).code,
        "insufficient_balance",
    );
});

Deno.test("outbound-dev#people/enrich/batch estimate: every person found on every kind asked, as outbound.dev holds it", async () => {
    const unit = await testSealedUnit(ID);
    const estimate = async (people: number, options: Record<string, Json>) =>
        (await estimateEndpoint(unit, {
            body: {
                people: Array.from(
                    { length: people },
                    (_, index) => ({
                        linkedinUrl: `https://www.linkedin.com/in/p-${index}`,
                    }),
                ),
                ...options,
            },
        })).credits.default;
    const cents = (dollars: number) => Math.round(dollars * 100);
    // `find` defaults to email, `providers` to package: $0.02 a person.
    assertEquals(cents(await estimate(3, {})), 6);
    assertEquals(cents(await estimate(100, { find: "phone" })), 500);
    assertEquals(cents(await estimate(2, { find: "email_and_phone" })), 14);
    assertEquals(
        cents(
            await estimate(2, {
                find: "email_and_phone",
                providers: "waterfall",
            }),
        ),
        30,
    );
});

Deno.test("outbound-dev#people/enrich/batch: the gate rejects no people, 101 people and a person named two ways, and passes 100", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}synthetic-enrich-batch-succeeded.json`,
    );
    const refused: Json[] = [
        { people: [] },
        { people: Array(101).fill(ANA) },
        { people: [{ ...ANA, fullName: "Ana Ruiz" }] },
        { people: [{ ...ANA, providers: "waterfall" }] },
        { people: [ANA], find: "fax" },
        { people: [ANA], maxSpendUsd: 0 },
    ];
    for (const body of refused) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
        );
    }
    await assertInputAccepted({
        unit,
        input: { body: { people: Array(100).fill(ANA), maxSpendUsd: 2 } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name:
        "outbound-dev#people/enrich/batch live: a one-person job ends with a result for that person",
    ignore: liveSkip("outbound-dev"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { body: { people: [RAFAEL], maxSpendUsd: 0.05 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const output = result.output as Record<string, unknown>;
        assertEquals(output.type, "people_enrichment");
        assertEquals((output.results as unknown[]).length, 1);
        assertEquals("chargedUsd" in output, false);
    },
});
