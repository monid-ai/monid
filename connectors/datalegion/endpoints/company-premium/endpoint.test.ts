import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { DATALEGION_KEYS } from "../../schema/auth.ts";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "datalegion#company/enrich/premium";
const INPUT = { body: { domain: "example.com" } };

Deno.test(`${ID} happy (synthetic): one credit from this product's own pool, and the vendor body rides out unchanged`, async () => {
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
        credits: { company_premium: 1 },
        evidence: { CALL: 1 },
    });
    // the key selects the product (design D1): nothing filters the fields,
    // so the output IS the vendor body
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(`${ID} no match (synthetic 404): zero-billed — the flat line never fires on a non-2xx`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-miss.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { domain: "nobody.example" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.httpStatus, 404);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: industry alone is not a company identifier`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    // v1's "Provide a company identifier" (design D4): `industry` only
    // sharpens a name match
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { industry: "software" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // the near-twin: the same industry beside a name passes
    await assertInputAccepted({
        unit,
        input: { body: { name: "example co", industry: "software" } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: `${ID} live (gated on the datalegion credentials)`,
    ignore: liveSkip("datalegion", DATALEGION_KEYS),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { body: { domain: "microsoft.com" } },
            mode: "live",
        });
        assertEquals(typeof result.httpStatus, "number");
    },
});
