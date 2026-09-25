import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "qbraid#get-job";
const INPUT = {
    pathParams: {
        qrn: "qbraid:qbraid:sim:qir-sv-32de-qjob-6ab2125ea32f8043c5e8e9d9",
    },
};

Deno.test(`${ID} happy: free, envelope passes through`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}happy.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown> & {
        data: Record<string, unknown>;
    };
    assertEquals(output.success, true);
    assertEquals(output.data.status, "COMPLETED");
    // the job READ carries the cost record — and bills nothing (usage above)
    assertEquals(output.data.estimatedCost, 0);
    assertEquals(output.data.cost, 0);
    assertEquals("gcsDestination" in output.data, false);
});

Deno.test(`${ID} provider error: 401 is data, zero usage, digested`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}provider-error.json`),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.message, "Invalid API key format");
    assertEquals(output.code, "INVALID_API_KEY_FORMAT");
});

Deno.test(`${ID}: unknown job — 404 is data`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}not-found.json`),
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, unknown>).message,
        "Job not found",
    );
});

Deno.test(`${ID} schema gate: a near-valid bad input is INVALID_INPUT, its twin passes`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { pathParams: { qrn: "" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertInputAccepted({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: `${ID} live (gated on QBRAID_CREDENTIALS_API_KEY): response shape`,
    ignore: liveSkip("qbraid"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: {
                pathParams: {
                    qrn: "qbraid:qbraid:sim:qir-sv-0000-qjob-000000000000000000000000",
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            true,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const output = result.output as Record<string, unknown>;
        assertEquals(typeof output.message, "string");
        assertEquals(typeof output.code, "string");
    },
});
