import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { OwnedResource } from "@shared/core";
import { loadFixture, loadResource, testResourceUnit } from "@shared/testing";

/**
 * boxcompute/vm ops through the COMPILED doc (the sealed-unit path the
 * host drives), replaying the connector's shared chains.
 */

const HERE = fromFileUrl(new URL("../../", import.meta.url));
const fixture = (name: string) => loadFixture(`${HERE}fixtures/${name}.json`);

const VM: OwnedResource = {
    resource: "boxcompute/vm",
    externalId: "sbx_224ff457bf3f4724841f4ccf343f1fcd",
    data: { size: "small", name: "new-vm" },
};
const DELETED: OwnedResource = {
    resource: "boxcompute/vm",
    externalId: "sbx_ed730f785e584b43982a8ada3722af1b",
    data: { size: "small", name: "monid-fixture" },
};

/** 204 replays fail in the fixture helpers until monid-ai/monid#199. */
const NO_CONTENT_REPLAY_BROKEN = true;

const load = async (name: string) =>
    loadResource({
        unit: await testResourceUnit("boxcompute/vm"),
        mode: "replay",
        fixture: await fixture(name),
    });

Deno.test("boxcompute vm verify: a stopped VM is alive", async () => {
    const resource = await load("get-cold");
    assertEquals(await resource.verify(VM), { active: true });
});

Deno.test("boxcompute vm verify: gone (404) and refused ('expired') are inactive", async () => {
    assertEquals(await (await load("get-missing")).verify(DELETED), {
        active: false,
        inactiveReason: "http_404",
    });
    assertEquals(await (await load("get-expired")).verify(DELETED), {
        active: false,
        inactiveReason: "state:expired",
    });
});

Deno.test({
    name: "boxcompute vm release: DELETE (204)",
    ignore: NO_CONTENT_REPLAY_BROKEN,
    fn: async () => {
        assertEquals(await (await load("delete-ok")).release(DELETED), {
            released: true,
        });
    },
});

Deno.test("boxcompute vm release: already deleted (404) is released; busy (409) throws to retry", async () => {
    assertEquals(await (await load("delete-gone")).release(DELETED), {
        released: true,
    });
    await assertRejects(
        async () =>
            await (await load("synthetic-delete-busy")).release(DELETED),
        Error,
        "HTTP 409",
    );
});

Deno.test("boxcompute vm refresh: size, name and network from the live record", async () => {
    assertEquals(await (await load("get-cold")).refresh(VM), {
        active: true,
        patch: { size: "small", name: "new-vm", blockNetwork: false },
    });
    assertEquals(await (await load("get-missing")).refresh(DELETED), {
        active: false,
    });
});

Deno.test("boxcompute vm reconcile: settled runs plus the running estimate", async () => {
    const resource = await load("costs-live");
    // 17640 + 834 + 47566 settled, 834 estimated for the run in progress
    assertEquals(
        await resource.reconcileUsage("compute", VM, {
            startIso: "2026-10-24T00:00:00.000Z",
            endIso: "2026-10-27T00:00:00Z",
        }),
        { consumes: { credit: "default", amount: 0.066874 } },
    );
});

Deno.test("boxcompute vm reconcile: runs count for their share inside the window", async () => {
    const resource = await load("synthetic-costs-window");
    // half of the run straddling the start (50040), the whole run inside
    // (50040), nothing of the run after the end, half of the running
    // estimate straddling the end (50040)
    assertEquals(
        await resource.reconcileUsage("compute", VM, {
            startIso: "2026-10-26T00:00:00Z",
            endIso: "2026-10-26T12:00:00Z",
        }),
        { consumes: { credit: "default", amount: 0.15012 } },
    );
});

Deno.test("boxcompute vm reconcile: after deletion, the history is found by the VM id", async () => {
    const resource = await load("costs-deleted");
    assertEquals(
        await resource.reconcileUsage("compute", DELETED, {
            startIso: "2026-10-26T00:00:00Z",
            endIso: "2026-10-27T00:00:00Z",
        }),
        { consumes: { credit: "default", amount: 0 } },
    );
});

Deno.test("boxcompute vm reconcile: a cut history or a missing estimate throws instead of billing short", async () => {
    const window = {
        startIso: "2026-10-26T00:00:00Z",
        endIso: "2026-10-26T12:00:00Z",
    };
    await assertRejects(
        async () =>
            await (await load("synthetic-costs-truncated")).reconcileUsage(
                "compute",
                VM,
                window,
            ),
        Error,
        "over 1000 runs",
    );
    await assertRejects(
        async () =>
            await (await load("synthetic-costs-unestimated")).reconcileUsage(
                "compute",
                VM,
                window,
            ),
        Error,
        "could not estimate",
    );
});
