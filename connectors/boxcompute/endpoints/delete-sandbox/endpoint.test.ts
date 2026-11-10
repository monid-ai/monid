import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, OwnedResource } from "@shared/core";
import {
    assertInputAccepted,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "boxcompute#delete-sandbox";
const NEW = "sbx_ed730f785e584b43982a8ada3722af1b";

const OWNED: OwnedResource[] = [{
    resource: "boxcompute/vm",
    externalId: NEW,
    data: { size: "small", name: "monid-fixture" },
}];

/** 204 replays fail in the fixture helpers until monid-ai/monid#199
 *  (`new Response` refuses a body on a null-body status). */
const NO_CONTENT_REPLAY_BROKEN = true;

const run = async (fixture: string) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { sandboxId: NEW } },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}.json`),
        resources: OWNED,
    });

Deno.test({
    name: "boxcompute#delete-sandbox: deleted at once, and the release mark",
    ignore: NO_CONTENT_REPLAY_BROKEN,
    fn: async () => {
        const result = await run("delete-ok");
        assertEquals(result.httpStatus, 200);
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assertEquals(result.output, { sandboxId: NEW, status: "deleted" });
        assertEquals(result.resources?.releases, [{
            resource: "boxcompute/vm",
            externalId: NEW,
        }]);
    },
});

Deno.test("boxcompute#delete-sandbox: already gone counts as deleted, and still marks the release", async () => {
    const result = await run("delete-gone");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, { sandboxId: NEW, status: "deleted" });
    assertEquals(result.resources?.releases, [{
        resource: "boxcompute/vm",
        externalId: NEW,
    }]);
});

Deno.test("boxcompute#delete-sandbox provider error: a busy VM is relayed, not released", async () => {
    const result = await run("synthetic-delete-busy");
    assertEquals(result.httpStatus, 409);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.resources?.releases, undefined);
    assertEquals(
        (result.output as Record<string, Json>).code,
        "SANDBOX_UNAVAILABLE",
    );
});

Deno.test("boxcompute#delete-sandbox: a foreign id never reaches upstream", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {
            body: { sandboxId: "sbx_ffffffffffffffffffffffffffffffff" },
        },
        mode: "replay",
        // no fixture: the pre-gate answers before any upstream call
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.resources?.releases, undefined);
});

Deno.test("boxcompute#delete-sandbox: only sbx_ ids, strict body", async () => {
    const unit = await testSealedUnit(ID);
    for (
        const body of [
            { sandboxId: NEW.toUpperCase() },
            { sandboxId: NEW, force: true },
        ] as Json[]
    ) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { body },
                    mode: "replay",
                    resources: OWNED,
                }),
            Error,
            "INVALID_INPUT",
        );
    }
    await assertInputAccepted({
        unit,
        input: { body: { sandboxId: NEW } },
        mode: "replay",
        resources: OWNED,
    });
});
