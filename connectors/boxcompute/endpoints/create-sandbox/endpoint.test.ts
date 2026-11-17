import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    assertInputAccepted,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "boxcompute#create-sandbox";
const NEW = "sbx_ed730f785e584b43982a8ada3722af1b";

const run = async (fixture: string) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { name: "monid-fixture" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}.json`),
    });

Deno.test("boxcompute#create-sandbox: pending, then running — 201, seed, pool internals stripped", async () => {
    const result = await run("synthetic-create-running");
    assertEquals(result.httpStatus, 201);
    assertEquals(result.isProviderError, false);
    // the call is free: the VM's time is the resource's compute line
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const seed = result.resources?.provisions?.[0];
    assert(seed !== undefined, "expected a provision seed");
    assertEquals(seed.resource, "boxcompute/vm");
    assertEquals(seed.externalId, NEW);
    assertEquals(seed.identifier, "monid-fixture");
    assertEquals(seed.data, {
        size: "small",
        name: "monid-fixture",
        blockNetwork: false,
    });
    const sandbox = (result.output as Record<string, Json>).sandbox as Record<
        string,
        Json
    >;
    assertEquals(sandbox.id, NEW);
    assertEquals(sandbox.state, "running");
    assertEquals(sandbox.workspaceId, undefined);
    assertEquals(sandbox.metadata, undefined);
});

Deno.test("boxcompute#create-sandbox: still booting after 100 s — 202, and the VM is owned all the same", async () => {
    // 20 pending reads: the chain fails if start reads more or fewer
    const result = await run("synthetic-create-slow");
    assertEquals(result.httpStatus, 202);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.resources?.provisions?.[0].externalId, NEW);
    const sandbox = (result.output as Record<string, Json>).sandbox as Record<
        string,
        Json
    >;
    assertEquals(sandbox.state, "pending");
});

Deno.test("boxcompute#create-sandbox: a VM refused at the account limit — 429, nothing provisioned", async () => {
    // its last call, the best-effort DELETE (204), is the replay that
    // monid-ai/monid#199 fixes; create-sandbox carries on either way
    const result = await run("create-refused");
    assertEquals(result.httpStatus, 429);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.resources?.provisions, undefined);
    assertEquals(
        (result.output as Record<string, Json>).code,
        "SANDBOX_REFUSED",
    );
});

Deno.test("boxcompute#create-sandbox provider error: an invalid key is relayed as data", async () => {
    const result = await run("unauthorized");
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.resources?.provisions, undefined);
    assertEquals(
        (result.output as Record<string, Json>).code,
        "INVALID_API_KEY",
    );
});

Deno.test("boxcompute#create-sandbox: only small and large, strict body", async () => {
    const unit = await testSealedUnit(ID);
    for (
        const body of [
            { size: "xl" },
            { size: "small", diskGiB: 10 },
        ] as Json[]
    ) {
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
        );
    }
    await assertInputAccepted({
        unit,
        input: { body: { size: "large", blockNetwork: true } },
        mode: "replay",
    });
});
