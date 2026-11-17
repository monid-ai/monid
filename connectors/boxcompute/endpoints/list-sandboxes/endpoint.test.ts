import { assertEquals } from "@std/assert";
import type { OwnedResource } from "@shared/core";
import { runEndpoint, testSealedUnit } from "@shared/testing";

/**
 * Served from the ownership window alone, so there is no fixture, no
 * provider error to relay and no input to gate: any upstream call would
 * fail the replay.
 */

const ID = "boxcompute#list-sandboxes";
const VM = "sbx_224ff457bf3f4724841f4ccf343f1fcd";
const NEW = "sbx_ed730f785e584b43982a8ada3722af1b";

const OWNED: OwnedResource[] = [
    {
        resource: "boxcompute/vm",
        externalId: VM,
        data: { size: "small", name: "new-vm", blockNetwork: false },
        syncedAt: "2026-10-26T08:00:00.000Z",
    },
    {
        resource: "boxcompute/vm",
        externalId: NEW,
        data: { size: "large", name: "monid-fixture" },
    },
];

Deno.test("boxcompute#list-sandboxes: the owned VMs, an allowlist of their data", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {},
        mode: "replay",
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, [
        {
            sandboxId: VM,
            size: "small",
            name: "new-vm",
            blockNetwork: false,
            syncedAt: "2026-10-26T08:00:00.000Z",
        },
        {
            sandboxId: NEW,
            size: "large",
            name: "monid-fixture",
            blockNetwork: false,
        },
    ]);
});

Deno.test("boxcompute#list-sandboxes: no VMs is an empty list", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {},
        mode: "replay",
        resources: [],
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.output, []);
});
