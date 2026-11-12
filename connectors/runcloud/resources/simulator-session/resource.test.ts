import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { OwnedResource } from "@shared/core";
import {
    type Fixture,
    loadFixture,
    loadResource,
    testResourceUnit,
} from "@shared/testing";
import { EngineError, EngineErrorCode } from "@monid/connector-engine";

/**
 * runcloud/simulator-session lifecycle and meter through the COMPILED doc,
 * the sealed-unit path the host drives. Chains replay in order on ONE
 * loaded resource.
 *
 * RATE under test (https://run.cloud/pricing, read 2026-11-12, and
 * run.cloud's per-second meter):
 * $0.02 per minute, metered per second, floor of the elapsed seconds.
 */

const HERE = fromFileUrl(new URL("../../", import.meta.url));
const fixture = (name: string) => loadFixture(`${HERE}fixtures/${name}.json`);

const SESSION: OwnedResource = {
    resource: "runcloud/simulator-session",
    externalId: "sess-1",
    data: { platform: "ios" },
};

/** A chain by fixture name, or an inline one. */
const load = async (chain: string | Fixture) =>
    await loadResource({
        unit: await testResourceUnit("runcloud/simulator-session"),
        mode: "replay",
        fixture: typeof chain === "string" ? await fixture(chain) : chain,
    });

Deno.test("runcloud resource: the rate card is the published per-minute price, one estimated line", async () => {
    const unit = await testResourceUnit("runcloud/simulator-session");
    assertEquals(unit.doc.usage, {
        period: { unit: "DAY", count: 1, anchor: "CREATION_TIME" },
        lines: {
            "active-time": {
                price: {
                    unit: "MINUTE",
                    every: 1,
                    consumes: { credit: "default", amount: 0.02 },
                },
            },
        },
    });
    assertEquals(Object.keys(unit.doc.reconcileUsage ?? {}), ["active-time"]);
});

Deno.test("runcloud resource: a running session verifies active and meters up to the window end", async () => {
    const resource = await load("synthetic-resource-active");
    assertEquals(await resource.verify(SESSION), { active: true });
    // created 10:00:00.000, window ends 10:01:30.999: floor(90.999) = 90 s
    assertEquals(
        await resource.reconcileUsage("active-time", SESSION, {
            startIso: "2026-11-12T10:00:02Z",
            endIso: "2026-11-12T10:01:30.999Z",
        }),
        { consumes: { credit: "default", amount: 0.03 } },
    );
});

Deno.test("runcloud resource: an ended session is inactive and bills to its release, not to the read", async () => {
    const resource = await load("synthetic-resource-ended");
    const checked = await resource.verify(SESSION);
    assertEquals(checked, { active: false, inactiveReason: "status:released" });
    // released 10:07:30.500, read hours later: floor(450.5) = 450 s
    // = 7.5 min x $0.02
    assertEquals(
        await resource.reconcileUsage("active-time", SESSION, {
            startIso: "2026-11-12T10:00:02Z",
            endIso: "2026-11-12T13:00:00Z",
        }),
        { consumes: { credit: "default", amount: 0.15 } },
    );
    // a period that starts after the release owes nothing
    assertEquals(
        await resource.reconcileUsage("active-time", SESSION, {
            startIso: "2026-11-13T10:00:02Z",
            endIso: "2026-11-13T11:00:00Z",
        }),
        { consumes: { credit: "default", amount: 0 } },
    );
});

Deno.test("runcloud resource: a session that never got a device reads zero", async () => {
    const resource = await load("synthetic-resource-never-leased");
    assertEquals(
        await resource.reconcileUsage("active-time", SESSION, {
            startIso: "2026-11-12T10:00:02Z",
            endIso: "2026-11-12T11:00:00Z",
        }),
        { consumes: { credit: "default", amount: 0 } },
    );
});

Deno.test("runcloud resource: release is idempotent and settles a pending release by re-reading", async () => {
    assertEquals(
        await (await load("synthetic-release-ok")).release(SESSION),
        { released: true },
    );
    assertEquals(
        await (await load("synthetic-release-pending-settled")).release(
            SESSION,
        ),
        { released: true },
    );
    const stuck = await assertRejects(
        async () =>
            await (await load("synthetic-release-pending-active")).release(
                SESSION,
            ),
        EngineError,
    );
    assertEquals(
        (stuck as EngineError).code,
        EngineErrorCode.RESOURCE_OP_FAILED,
    );
});

Deno.test("runcloud resource: a failed meter read throws instead of billing zero; foreign instances refused", async () => {
    const resource = await load({
        name: "inline-meter-500",
        description: "The session read fails: the meter must throw.",
        calls: [{
            req: {
                method: "GET",
                url: "{{request.origin}}/run-cloud/ios/sess-1",
            },
            res: { status: 500, body: { error: "boom" } },
        }],
    });
    await assertRejects(
        () =>
            resource.reconcileUsage("active-time", SESSION, {
                startIso: "2026-11-12T10:00:02Z",
                endIso: "2026-11-12T11:00:00Z",
            }),
        EngineError,
    );
    const foreign = await assertRejects(
        () => resource.verify({ ...SESSION, resource: "runcloud/other" }),
        EngineError,
    );
    assertEquals(
        (foreign as EngineError).code,
        EngineErrorCode.INVALID_INPUT,
    );
});
