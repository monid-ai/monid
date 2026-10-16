import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

/** The five ids, exactly as the lock records them. */
const IDS = [
    "vela-breakout#breakouts",
    "vela-breakout#company",
    "vela-breakout#groups",
    "vela-breakout#ideas",
    "vela-breakout#rising-companies",
];

Deno.test("vela-breakout: five GET docs, bearer auth, dollar pool, $0.02 lists, $0.01 /company, free /groups, no consolidate", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("vela-breakout#")
    ).sort();
    assertEquals(ids, IDS);

    const authKeys = new Set<string>();
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.request.method, "GET", id);
        assert(
            doc.request.url.startsWith(
                "https://breakout.vela.partners/api/v1/",
            ),
            id,
        );
        authKeys.add(doc.auth.inject.$fn.key);
        assertEquals(doc.usage.consolidate, undefined, id);
        assertEquals(doc.input.toRequest, undefined, id);
        if (id === "vela-breakout#groups") {
            assertEquals(doc.usage.model.kind, "FREE");
            assertEquals(doc.usage.credits, {});
        } else {
            assertEquals(doc.usage.model.kind, "PER_CALL", id);
            assertEquals(
                "consumes" in doc.usage.model
                    ? doc.usage.model.consumes
                    : undefined,
                {
                    credit: "default",
                    amount: id === "vela-breakout#company" ? 0.01 : 0.02,
                },
                id,
            );
            assertEquals(
                doc.usage.credits,
                { default: { label: "US dollars" } },
                id,
            );
        }
    }
    // one bearer preset shared by all five
    assertEquals(authKeys.size, 1);
});

Deno.test("vela-breakout#groups happy (synthetic): free, zero usage, groups relayed", async () => {
    const unit = await testSealedUnit("vela-breakout#groups");
    const fixture = await loadFixture(`${fixturesDir}synthetic-groups-ok.json`);
    const result = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const groups = (result.output as { groups: Record<string, unknown>[] })
        .groups;
    assertEquals(groups.map((g) => g.id), [
        "ai_apps",
        "agent_tools",
        "business_software",
        "company_hiring",
    ]);
    assertEquals(groups[0].usual_window_days, 30);
    assertEquals(typeof groups[0].caveat, "string");
});

Deno.test("vela-breakout#groups 401 (synthetic): data, zero usage", async () => {
    const unit = await testSealedUnit("vela-breakout#groups");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-unauthorized.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test({
    name:
        "vela-breakout#groups live (gated on VELA_BREAKOUT_CREDENTIALS_API_KEY)",
    ignore: liveSkip("vela-breakout"),
    fn: async () => {
        const unit = await testSealedUnit("vela-breakout#groups");
        const result = await runEndpoint({ unit, input: {}, mode: "live" });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const groups = (result.output as { groups: { id: string }[] })
            .groups;
        assert(groups.some((g) => g.id === "ai_apps"));
    },
});
