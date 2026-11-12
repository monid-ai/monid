import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import { EngineError, EngineErrorCode } from "@monid/connector-engine";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

/**
 * kosa8#list-templates — free and unbound (`GET /v1/templates`). The
 * replay fixtures are SYNTHETIC: constructed by hand from the kosa8 Cloud
 * worker source (workers/cloud-api/src), not recorded — no live key was
 * used. The live test needs no sandbox: listing templates creates
 * nothing and costs nothing.
 */

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const fixture = (name: string) => loadFixture(`${fixturesDir}${name}.json`);

const UNIT = "kosa8#list-templates";
const FREE_RUN = { credits: {}, evidence: {} };

Deno.test("kosa8#list-templates happy (synthetic 200): free, unbound", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(UNIT),
        input: {},
        mode: "replay",
        fixture: await fixture("synthetic-list-templates"),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, FREE_RUN);
    // templates carry no cost_usd, so the provider strip leaves them whole
    const out = result.output as Record<string, Json>;
    assertEquals(out.default_template, "base");
    assertEquals(
        (out.templates as Record<string, Json>[]).map((t) => t.key),
        ["base", "node", "python"],
    );
});

Deno.test("kosa8#list-templates: schema gate — a stray query param is refused; no params passes", async () => {
    const error = await assertRejects(
        async () =>
            runEndpoint({
                unit: await testSealedUnit(UNIT),
                input: { queryParams: { region: "eu-hel1" } },
                mode: "replay",
                fixture: await fixture("synthetic-list-templates"),
            }),
        EngineError,
    );
    assertEquals((error as EngineError).code, EngineErrorCode.INVALID_INPUT);
    // near-twin: an empty queryParams object is the no-params call
    const result = await runEndpoint({
        unit: await testSealedUnit(UNIT),
        input: { queryParams: {} },
        mode: "replay",
        fixture: await fixture("synthetic-list-templates"),
    });
    assertEquals(result.httpStatus, 200);
});

Deno.test("kosa8#list-templates provider error (synthetic 401 unauthorized): empty usage", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(UNIT),
        input: {},
        mode: "replay",
        fixture: await fixture("synthetic-list-templates-unauthorized"),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, FREE_RUN);
    assertEquals((result.output as Record<string, Json>).error, "unauthorized");
});

Deno.test({
    name: "kosa8#list-templates live (gated on KOSA8_API_KEY)",
    ignore: liveSkip("kosa8"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(UNIT),
            input: {},
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, FREE_RUN);
        const out = result.output as Record<string, Json>;
        assertEquals(typeof out.default_template, "string");
        assert(Array.isArray(out.templates), "templates is an array");
        for (const t of out.templates as Record<string, Json>[]) {
            assertEquals(typeof t.key, "string");
            assertEquals(typeof t.cpus, "number");
            assertEquals(typeof t.mem_mb, "number");
            assert(Array.isArray(t.regions), "regions is an array");
        }
    },
});
