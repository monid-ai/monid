import { assert, assertEquals, assertRejects } from "@std/assert";
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
const ID = "fuse#data/people/enrich-jobs";
const TWO_PEOPLE: Json = {
    people: [
        { linkedinUrl: "https://www.linkedin.com/in/ada-fielding" },
        { name: "Rafael Ortiz", companyDomain: "ledgerline.example" },
    ],
    find: ["email", "phone"],
};

const run = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("fuse#data/people/enrich-jobs: a finished job settles the 15 on its receipt", async () => {
    const result = await run("synthetic-enrich-job-completed.json", TWO_PEOPLE);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // One person found on both kinds (5 + 10), one found nothing.
    assertEquals(result.usage, {
        credits: { default: 15 },
        evidence: { CREDIT: 15 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.status, "completed");
    assertEquals("creditsCharged" in output, false);
    const rows = output.rows as Record<string, unknown>[];
    assertEquals(rows.length, 2);
    // Each row keeps its own charge: it says which rows were paid for.
    assertEquals(rows.map((row) => row.creditsCharged), [15, 0]);
});

Deno.test("fuse#data/people/enrich-jobs: a job stopped for credits settles the rows it finished", async () => {
    const result = await run("synthetic-enrich-job-stopped.json", TWO_PEOPLE);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 5 },
        evidence: { CREDIT: 5 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.status, "stopped");
    assertEquals(output.stoppedReason, "INSUFFICIENT_CREDITS");
});

Deno.test("fuse#data/people/enrich-jobs: a failed read holds the run open, and a zero receipt settles zero", async () => {
    const result = await run("synthetic-enrich-job-transient.json", {
        people: [{ name: "Rafael Ortiz", companyDomain: "ledgerline.example" }],
        find: ["email"],
    });
    // 429 then 503 on the read: the job kept running, so the run did too.
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: { CREDIT: 0 } });
    assertEquals(
        (result.output as Record<string, unknown>).status,
        "completed",
    );
});

Deno.test("fuse#data/people/enrich-jobs: a refused submit is zero-billed data", async () => {
    const result = await run("synthetic-enrich-job-refused.json", TWO_PEOPLE);
    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, unknown>).code,
        "INSUFFICIENT_CREDITS",
    );
});

Deno.test("fuse#data/people/enrich-jobs estimate: every person found on every kind asked", async () => {
    // The plan's people_email (5) and people_phone (10) prices, 2026-10-29.
    const unit = await testSealedUnit(ID);
    const estimate = async (people: number, find: string[]) =>
        (await estimateEndpoint(unit, {
            body: {
                people: Array.from(
                    { length: people },
                    (_, index) => ({
                        linkedinUrl: `https://www.linkedin.com/in/p-${index}`,
                    }),
                ),
                find,
            },
        })).credits;
    assertEquals(await estimate(2, ["email", "phone"]), { default: 30 });
    assertEquals(await estimate(3, ["email"]), { default: 15 });
    assertEquals(await estimate(100, ["phone"]), { default: 1000 });
});

Deno.test("fuse#data/people/enrich-jobs: the gate rejects an unknown kind and 101 people, and passes 100", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}synthetic-enrich-job-completed.json`,
    );
    const person = { linkedinUrl: "https://www.linkedin.com/in/ada-fielding" };
    const refused: Json[] = [
        { people: [person], find: ["fax"] },
        { people: Array(101).fill(person), find: ["email"] },
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
        input: { body: { people: Array(100).fill(person), find: ["email"] } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name:
        "fuse#data/people/enrich-jobs live: a one-person job finishes with at most one row",
    ignore: liveSkip("fuse"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: {
                body: {
                    people: [{
                        name: "Ada Fielding",
                        companyDomain: "northwind-payments.example",
                    }],
                    find: ["email"],
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const output = result.output as Record<string, unknown>;
        assert(
            ["completed", "stopped", "failed"].includes(String(output.status)),
        );
        // A job that stops or fails before reaching the person ends with no
        // row; `processed` is Fuse's count of the rows it answers.
        assert(Array.isArray(output.rows) && output.rows.length <= 1);
        assertEquals(output.rows.length, output.processed);
    },
});
