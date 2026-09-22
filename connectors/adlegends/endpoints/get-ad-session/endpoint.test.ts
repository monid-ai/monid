import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const ID = "adlegends#get_ad_session";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy (synthetic)`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body: { sessionId: 1 } },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-tool-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID}: sessionId required`, async () => {
    const unit = await testSealedUnit(ID);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: {} },
                mode: "replay",
                fixture: await loadFixture(`${chains}synthetic-tool-ok.json`),
            }),
        Error,
        "INVALID_INPUT",
    );
});
