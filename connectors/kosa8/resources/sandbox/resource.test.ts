import { assertAlmostEquals, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { OwnedResource } from "@shared/core";
import { loadFixture, loadResource, testResourceUnit } from "@shared/testing";
import { EngineError } from "@monid/connector-engine";

/**
 * kosa8/sandbox through the COMPILED doc. Chains are synthetic, built
 * from the worker's `publicSandbox` shape (see the fixture descriptions).
 *
 * The meter's expected amounts are kosa8's own formula (worker
 * `billing.js` computeCost / sleepCost, RATES) applied by hand to the
 * fixture's counters: 2 vCPU, 4096 MB, eu-hel1 (×1.0), 3600 s running,
 * 7200 s asleep on a 4 GiB snapshot.
 */

const HERE = fromFileUrl(new URL("../../", import.meta.url));
const fixture = (name: string) => loadFixture(`${HERE}fixtures/${name}.json`);

const ROW: OwnedResource = {
    resource: "kosa8/sandbox",
    externalId: "sbx_4fQm9TzR2kLw8VbN1cXyPa",
    data: { template: "python", region: "eu-hel1", cpus: 2, memMb: 4096 },
};
const WINDOW = {
    startIso: "2026-11-03T08:00:00.000Z",
    endIso: "2026-11-03T11:00:00.000Z",
};

Deno.test("kosa8 sandbox: verify (alive) then release (404 tolerated — already deleted)", async () => {
    const resource = await loadResource({
        unit: await testResourceUnit("kosa8/sandbox"),
        mode: "replay",
        fixture: await fixture("synthetic-resource-ops"),
    });
    assertEquals(await resource.verify(ROW), { active: true });
    assertEquals(await resource.release(ROW), { released: true });
});

Deno.test("kosa8 sandbox: the three meter lines follow kosa8's own cost formula", async () => {
    const resource = await loadResource({
        unit: await testResourceUnit("kosa8/sandbox"),
        mode: "replay",
        fixture: await fixture("synthetic-resource-meter"),
    });
    const vcpu = await resource.reconcileUsage("vcpu", ROW, WINDOW);
    // 1 h × 2 vCPU × $0.048
    assertEquals(vcpu.consumes.credit, "default");
    assertAlmostEquals(vcpu.consumes.amount, 0.096, 1e-12);
    const memory = await resource.reconcileUsage("memory", ROW, WINDOW);
    // 1 h × 4 GiB × $0.0154
    assertAlmostEquals(memory.consumes.amount, 0.0616, 1e-12);
    const snapshot = await resource.reconcileUsage(
        "snapshot-storage",
        ROW,
        WINDOW,
    );
    // 2 h × 4 GiB × $0.08 / 730 h
    assertAlmostEquals(snapshot.consumes.amount, (2 * 4 * 0.08) / 730, 1e-12);
    // the three lines sum to the worker's own cost_usd (0.1585, 4 dp)
    assertAlmostEquals(
        vcpu.consumes.amount + memory.consumes.amount +
            snapshot.consumes.amount,
        0.1585,
        5e-5,
    );
});

Deno.test("kosa8 sandbox: a deleted sandbox is metered from the ?all=1 list", async () => {
    const resource = await loadResource({
        unit: await testResourceUnit("kosa8/sandbox"),
        mode: "replay",
        fixture: await fixture("synthetic-resource-meter-deleted"),
    });
    const vcpu = await resource.reconcileUsage("vcpu", ROW, WINDOW);
    assertAlmostEquals(vcpu.consumes.amount, 0.096, 1e-12);
});

Deno.test("kosa8 sandbox: an unreadable meter throws (settle late, never a silent $0)", async () => {
    const resource = await loadResource({
        unit: await testResourceUnit("kosa8/sandbox"),
        mode: "replay",
        fixture: {
            name: "inline-meter-missing",
            description: "the id route 404s and the list does not hold it",
            calls: [
                {
                    req: {
                        method: "GET",
                        url: "{{request.origin}}/v1/sandboxes/" +
                            ROW.externalId,
                    },
                    res: {
                        status: 404,
                        body: {
                            error: "not_found",
                            message: "no such sandbox",
                        },
                    },
                },
                {
                    req: {
                        method: "GET",
                        url: "{{request.origin}}/v1/sandboxes?all=1",
                    },
                    res: { status: 200, body: { sandboxes: [] } },
                },
            ],
        },
    });
    await assertRejects(
        () => resource.reconcileUsage("vcpu", ROW, WINDOW),
        EngineError,
    );
});
