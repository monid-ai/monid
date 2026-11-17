import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const ID = "unykorn#check/address";
const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy (recorded): whole usage, returns pass verdict and receipt`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                params: {
                    value: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                    chain: "base",
                },
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}check-address-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.01 },
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.ok, true);
    assertEquals(output.verdict, "pass");
});
