import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "lumify#events/{event_id}/intelligence";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = { pathParams: { event_id: "12345" } };

Deno.test(`${ID} happy (synthetic): one credit when available`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { RESULT: 1 },
    });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(
    `${ID} unavailable (synthetic 200): zero usage when available is false`,
    async () => {
        const unit = await testSealedUnit(ID);
        const fixture = await loadFixture(
            `${fixturesDir}synthetic-unavailable.json`,
        );
        const result = await runEndpoint({
            unit,
            input: INPUT,
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200);
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
    },
);

Deno.test(
    `${ID} forecasts-only (synthetic 200): one credit when available is false but forecasts is nonempty`,
    async () => {
        const unit = await testSealedUnit(ID);
        const fixture = await loadFixture(
            `${fixturesDir}synthetic-forecasts-only.json`,
        );
        const result = await runEndpoint({
            unit,
            input: INPUT,
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200);
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage, {
            credits: { default: 1 },
            evidence: { RESULT: 1 },
        });
    },
);

Deno.test(`${ID} provider error (synthetic 404): zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID}: the event id is required`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { pathParams: {} },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
});

Deno.test({
    name: `${ID} live (gated on LUMIFY_API_KEY)`,
    ignore: liveSkip("lumify"),
    fn: async () => {
        const listed = await runEndpoint({
            unit: await testSealedUnit("lumify#events"),
            input: { queryParams: { limit: 1 } },
            mode: "live",
        });
        assertEquals(
            listed.isProviderError,
            false,
            JSON.stringify(listed.output),
        );
        const body = listed.output as Record<string, Json>;
        const rows = (Array.isArray(body.events) ? body.events : []) as Array<
            Record<string, Json>
        >;
        const eventId = rows[0]?.id;
        assert(eventId !== undefined && eventId !== null, "need an event_id");
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { pathParams: { event_id: String(eventId) } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(
            typeof (result.output as Record<string, Json>).available,
            "boolean",
        );
    },
});
