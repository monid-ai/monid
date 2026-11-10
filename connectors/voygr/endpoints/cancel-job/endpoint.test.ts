import { assertEquals, assertRejects } from "@std/assert";
import { type RunInput } from "@shared/core";
import {
    assertInputAccepted,
    liveSkip,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { harness, OWNED } from "../../test-support.ts";

/**
 * `voygr#cancel-job`. Every fixture was recorded live: the cancel of a
 * queued job, a cancel after the job had completed, and a made-up id.
 */

const ID = "voygr#cancel-job";
const h = harness(ID, import.meta.url);
const ZERO = { credits: {}, evidence: {} };

Deno.test("cancel-job relays", async () => {
    const cases: [string, string, string][] = [
        ["cancelled", "batch_01M5YB7SAQQS39VXMJF31MJKAW", "cancelled"],
        // a job that had already finished keeps its status
        ["completed-job", "batch_01M5YB5CABS9NJ8C5B9WD5YR6V", "completed"],
    ];
    for (const [name, batch_id, status] of cases) {
        const result = await h.run(name, { pathParams: { batch_id } });
        assertEquals(result.httpStatus, 200, name);
        assertEquals(result.isProviderError, false, name);
        assertEquals(result.usage, ZERO, name);
        assertEquals(result.output, { batch_id, status }, name);
        assertEquals(result.output, await h.recorded(name), name);
    }
});

Deno.test("foreign batch_id 404", async () => {
    const result = await h.run("unknown-batch-404", {
        pathParams: { batch_id: "batch_00000000000000000000000000000000" },
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, ZERO);
    assertEquals(result.output, await h.recorded("unknown-batch-404"));
});

Deno.test("cancel-job schema: batch_id is required and non-empty", async () => {
    const unit = await testSealedUnit(ID);
    const rejected: [string, RunInput][] = [
        ["no path params", {}],
        ["no batch_id", { pathParams: {} }],
        ["empty batch_id", { pathParams: { batch_id: "" } }],
        ["a typo'd key", { pathParams: { batchid: "batch_1" } }],
    ];
    for (const [shape, input] of rejected) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input,
                    mode: "replay",
                    resources: [OWNED],
                }),
            Error,
            "INVALID_INPUT",
            shape,
        );
    }
    await assertInputAccepted({
        unit,
        input: { pathParams: { batch_id: "batch_01M5YB7SAQQS39VXMJF31MJKAW" } },
        mode: "replay",
        fixture: await h.fixture("cancelled"),
        resources: [OWNED],
    });
});

Deno.test("cancel-job declares the sub-account binding", () =>
    h.assertBinding());

Deno.test("cancel-job fails closed without a sub-account", () =>
    h.assertFailsClosed({ pathParams: { batch_id: "batch_1" } }));

Deno.test("cancel-job sends a bodyless DELETE with the workspace's sub-account", () =>
    h.assertOnTheWire({ pathParams: { batch_id: "batch_1" } }, {
        method: "DELETE",
        url: "https://api.voygr.tech/v1/jobs/batch_1",
    }, { body: { batch_id: "batch_1", status: "cancelled" } }));

Deno.test({
    name: "voygr#cancel-job live: an unknown batch_id is a 404 at zero",
    ignore: liveSkip("voygr"),
    fn: async () => {
        // a job that is not this workspace's: nothing is cancelled
        const result = await h.live({
            pathParams: { batch_id: "batch_00000000000000000000000000000000" },
        });
        assertEquals(result.httpStatus, 404, JSON.stringify(result));
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, ZERO);
    },
});
