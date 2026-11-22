import { assertAlmostEquals, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { OwnedResource } from "@shared/core";
import { loadFixture, loadResource, testResourceUnit } from "@shared/testing";

/** computesdk/sandbox ops through the compiled doc; chains consume in order. */

const HERE = fromFileUrl(new URL("../../", import.meta.url));
const fixture = (name: string) => loadFixture(`${HERE}fixtures/${name}.json`);

const ROW: OwnedResource = {
    resource: "computesdk/sandbox",
    externalId: "sbx-1",
    data: { provider: "tensorlake", size: "small" },
};

Deno.test("computesdk sandbox: verify (running) then release", async () => {
    const resource = await loadResource({
        unit: await testResourceUnit("computesdk/sandbox"),
        mode: "replay",
        fixture: await fixture("synthetic-resource-ops"),
    });
    assertEquals(await resource.verify(ROW), { active: true });
    assertEquals(await resource.release(ROW), { released: true });
});

Deno.test("computesdk sandbox: a timed-out sandbox verifies inactive; refresh on 404 stays inactive", async () => {
    const resource = await loadResource({
        unit: await testResourceUnit("computesdk/sandbox"),
        mode: "replay",
        fixture: await fixture("synthetic-resource-degraded"),
    });
    const checked = await resource.verify(ROW);
    assertEquals(checked.active, false);
    assertEquals(
        checked.inactiveReason,
        "destroyed_at:2026-11-13T20:46:50.578Z",
    );
    assertEquals((await resource.refresh(ROW)).active, false);
});

Deno.test("computesdk sandbox: reconcile bills elapsed runtime inside the window at the sandbox's rate", async () => {
    const resource = await loadResource({
        unit: await testResourceUnit("computesdk/sandbox"),
        mode: "replay",
        fixture: await fixture("synthetic-resource-reconcile"),
    });
    // 30 min at $0.10/hr
    const whole = await resource.reconcileUsage("compute", ROW, {
        startIso: "2026-11-13T00:00:00Z",
        endIso: "2026-11-14T00:00:00Z",
    });
    assertEquals(whole.consumes.credit, "default");
    assertAlmostEquals(whole.consumes.amount, 0.05, 1e-6);
    // window opens 15 min into the run
    const part = await resource.reconcileUsage("compute", ROW, {
        startIso: "2026-11-13T20:15:00Z",
        endIso: "2026-11-14T00:00:00Z",
    });
    assertAlmostEquals(part.consumes.amount, 0.025, 1e-6);
});

Deno.test("computesdk sandbox: reconcile bills a RUNNING sandbox (destroyedAt null) up to the window end", async () => {
    const resource = await loadResource({
        unit: await testResourceUnit("computesdk/sandbox"),
        mode: "replay",
        fixture: await fixture("synthetic-resource-reconcile-running"),
    });
    // created 20:00 at $0.10/hr; window closes 20:30 (no seconds)
    const got = await resource.reconcileUsage("compute", ROW, {
        startIso: "2026-11-13T00:00Z",
        endIso: "2026-11-13T20:30Z",
    });
    assertAlmostEquals(got.consumes.amount, 0.05, 1e-6);
});

Deno.test("computesdk sandbox: a 404 reconcile read throws instead of settling zero", async () => {
    const resource = await loadResource({
        unit: await testResourceUnit("computesdk/sandbox"),
        mode: "replay",
        fixture: await fixture("synthetic-resource-reconcile-gone"),
    });
    await assertRejects(() =>
        resource.reconcileUsage("compute", ROW, {
            startIso: "2026-11-13T00:00:00Z",
            endIso: "2026-11-14T00:00:00Z",
        })
    );
});
