import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { directTransport, Engine } from "@monid/connector-engine";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import type { Json } from "@shared/core";

const ID = "datalegion#person/enrich/base-no-pii";
const input = {
    body: {
        "email": "person@example.com",
        "limit": 2,
        "multiple_results": true,
    },
};
const fixture = (shape: string) =>
    loadFixture(
        fromFileUrl(
            new URL(
                `../../fixtures/synthetic-person-${shape}.json`,
                import.meta.url,
            ),
        ),
    );

Deno.test(`${ID} replay: contract rate: multiple matches charge one successful call`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input,
        mode: "replay",
        fixture: await fixture("happy"),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 0.013 },
        evidence: { RESULT: 1 },
    });
    assertEquals(await estimateEndpoint(unit, input), {
        credits: { default: 0.013 },
        evidence: { RESULT: 1 },
    });
    assertEquals(
        await estimateEndpoint(unit, {
            body: { ...input.body, multiple_results: false },
        }),
        { credits: { default: 0.013 }, evidence: { RESULT: 1 } },
    );
    const { limit: _limit, ...withoutLimit } = input.body;
    assertEquals(await estimateEndpoint(unit, { body: withoutLimit }), {
        credits: { default: 0.013 },
        evidence: { RESULT: 1 },
    });
    // Billing counts matched calls, independent of the number of records.
    const single = await fixture("happy");
    single.calls[0].res.body = {
        matches: [{ legion_id: "synthetic-one" }],
        total: 1,
    };
    const singleResult = await runEndpoint({
        unit,
        input,
        mode: "replay",
        fixture: single,
    });
    assertEquals(singleResult.usage.credits, { default: 0.013 });
});

Deno.test(`${ID} empty, unmatched and permission failures have zero credits`, async () => {
    const unit = await testSealedUnit(ID);
    for (const shape of ["empty", "no-match", "forbidden"]) {
        const result = await runEndpoint({
            unit,
            input,
            mode: "replay",
            fixture: await fixture(shape),
        });
        assertEquals(result.usage.credits, {});
        assertEquals(result.isProviderError, shape !== "empty");
    }
    for (const status of [400, 401, 402, 422, 429, 500, 503]) {
        const errorFixture = await fixture("forbidden");
        errorFixture.calls[0].res.status = status;
        const result = await runEndpoint({
            unit,
            input,
            mode: "replay",
            fixture: errorFixture,
        });
        assertEquals(result.httpStatus, status);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assertEquals(result.output, errorFixture.calls[0].res.body);
    }
});

Deno.test(`${ID} rejects invalid cap, unknown fields and wrong types`, async () => {
    const unit = await testSealedUnit(ID);
    const invalid: Record<string, Json>[] = [
        { ...input.body, limit: 0 },
        { ...input.body, limit: 11 },
        { ...input.body, bogus: true },
        { ...input.body, multiple_results: "true" },
    ];
    for (const body of invalid) {
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
        );
    }
});

Deno.test(`${ID} transport selects only its own credential and API-Key header`, async () => {
    const unit = await testSealedUnit(ID);
    const loaded = await new Engine({
        transport: directTransport({
            params: () =>
                Promise.resolve({
                    personBaseNoPiiApiKey: "synthetic-selected-key",
                }),
            fetch: (url, init) => {
                assertEquals(
                    String(url),
                    "https://api.datalegion.ai/person/enrich",
                );
                assertEquals(init?.method, "POST");
                assertEquals(
                    new Headers(init?.headers).get("API-Key"),
                    "synthetic-selected-key",
                );
                assertEquals(JSON.parse(String(init?.body)), input.body);
                return Promise.resolve(
                    Response.json({ matches: [], total: 0 }),
                );
            },
        }),
    }).load(unit);
    await loaded.run(input);
});

Deno.test({
    name: `${ID} live (explicit key and network permissions required)`,
    ignore: !Deno.args.includes("--live-datalegion") ||
        liveSkip("datalegion", ["personBaseNoPiiApiKey"]),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                body: { ...input.body, limit: 1, multiple_results: false },
            },
            mode: "live",
        });
        // An unmatched identifier returns 404 rather than a billable result.
        assertEquals(
            [200, 404].includes(result.httpStatus),
            true,
            JSON.stringify(result.output),
        );
    },
});
