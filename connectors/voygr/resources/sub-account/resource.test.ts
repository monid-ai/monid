import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, OwnedResource } from "@shared/core";
import {
    type Fixture,
    loadFixture,
    loadResource,
    testResourceUnit,
} from "@shared/testing";
import { EngineError, EngineErrorCode } from "@monid/connector-engine";

/**
 * voygr/sub-account resource ops through the COMPILED doc (the same
 * sealed-unit path the host drives). Each test replays a ONE-call chain
 * picked from the shared synthetic fixture by method and status; the
 * ids in it are made up.
 */

const HERE = fromFileUrl(new URL("../../", import.meta.url));
const OPS = await loadFixture(`${HERE}fixtures/synthetic-sub-account-ops.json`);

/** A one-call chain: the fixture's call with this method and status. */
function chain(method: string, status: number): Fixture {
    const call = OPS.calls.find((c) =>
        c.req.method === method && c.res.status === status
    );
    assert(call !== undefined, `no ${method} ${status} call in the fixture`);
    return { ...OPS, calls: [call] };
}

const ROW: OwnedResource = {
    resource: "voygr/sub-account",
    externalId: "sub_00000000000000000000000000000001",
    data: { reference: "monid:ws-1" },
};

const load = async (fixture?: Fixture) =>
    loadResource({
        unit: await testResourceUnit("voygr/sub-account"),
        mode: "replay",
        fixture,
    });

Deno.test("verify: 200 is active even when suspended", async () => {
    // the fixture's 200 body says status "suspended": a suspended
    // sub-account still exists, so it stays owned (never re-created)
    assertEquals(
        (chain("GET", 200).calls[0].res.body as { status: string }).status,
        "suspended",
    );
    const resource = await load(chain("GET", 200));
    assertEquals(await resource.verify(ROW), { active: true });
});

Deno.test("verify: 404 is inactive", async () => {
    const resource = await load(chain("GET", 404));
    assertEquals(await resource.verify(ROW), {
        active: false,
        inactiveReason: "http_404",
    });
});

Deno.test("verify: 500 throws", async () => {
    const resource = await load(chain("GET", 500));
    const error = await assertRejects(() => resource.verify(ROW), EngineError);
    assertEquals(error.code, EngineErrorCode.RESOURCE_OP_FAILED);
    assert(
        error.message.includes("voygr sub-account verify failed with HTTP 500"),
        error.message,
    );
});

Deno.test("release: no upstream call", async () => {
    // no fixture = any upstream call fails the test
    const resource = await load();
    assertEquals(await resource.release(ROW), { released: true });
});

Deno.test("resource is free: a $0 rent line on a monthly clock", async () => {
    const { doc } = await testResourceUnit("voygr/sub-account");
    assertEquals(doc.usage, {
        period: { unit: "MONTH", count: 1, anchor: "CREATION_TIME" },
        lines: { rent: { consumes: { credit: "default", amount: 0 } } },
    });
});

Deno.test("instance data is strict: unknown keys and a missing reference are refused", async () => {
    const resource = await load();
    const bad: Json[] = [{ reference: "monid:ws-1", extra: 1 }, {}];
    for (const data of bad) {
        const error = await assertRejects(
            () => resource.verify({ ...ROW, data }),
            EngineError,
        );
        assertEquals(error.code, EngineErrorCode.INVALID_INPUT);
    }
});
