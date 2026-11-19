import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

const ID = "hirebase#jobs/search";
const HAPPY = {
    body: {
        job_titles: ["data engineer"],
        location_types: ["Remote"],
        limit: 2,
    },
};

Deno.test(`${ID} happy: billed per job returned`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: HAPPY,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { jobs: 2 },
        evidence: { RESULT: 2 },
    });
    const output = result.output as { jobs: { _id: string }[] };
    assertEquals(output.jobs.length, 2);
    assert(typeof output.jobs[0]._id === "string");
});

Deno.test(`${ID} empty: a search that matches nothing is free`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}empty.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                job_titles: ['"zzqx nonexistent title qqq"'],
                limit: 5,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
});

Deno.test(`${ID} provider error: 401 is data, zero usage, readable message`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { limit: 1 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        message: "Invalid API key",
        raw: { detail: "Invalid API key" },
    });
});

Deno.test(`${ID} 422: a list-shaped detail becomes one message`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}invalid-filter.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                experience: ["Senior"],
                sub_industry: ["Not A Real Subindustry"],
                limit: 1,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as { message: string };
    assert(output.message.startsWith("Invalid request: "));
});

Deno.test(`${ID}: limit is required and capped, unknown filters are rejected`, async () => {
    const unit = await testSealedUnit(ID);
    const schema = unit.doc.input.schema.body as {
        required?: string[];
        additionalProperties?: boolean;
        properties: Record<string, { maximum?: number }>;
    };
    assertEquals(schema.required, ["limit"]);
    assertEquals(schema.properties.limit.maximum, 100);
    // Hirebase answers 422 for an unknown field; the strict schema stops
    // it before the wire (job_type instead of job_types is the classic)
    assertEquals(schema.additionalProperties, false);
});

Deno.test({
    name: `${ID} live (gated on HIREBASE_CREDENTIALS_API_KEY)`,
    ignore: liveSkip("hirebase"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { body: { job_titles: ["software engineer"], limit: 2 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, {
            credits: { jobs: 2 },
            evidence: { RESULT: 2 },
        });
    },
});
