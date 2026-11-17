import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { type RunInput } from "@shared/core";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { harness, OWNED } from "../../test-support.ts";

/**
 * `voygr#get-job`. Both fixtures were recorded live: a second read of the
 * validate job in validate-batch/fixtures/happy.json, and a made-up id.
 */

const ID = "voygr#get-job";
const h = harness(ID, import.meta.url);
const BATCH = "batch_01M5YB5CABS9NJ8C5B9WD5YR6V";
const INPUT = { pathParams: { batch_id: BATCH } };
const ZERO = { credits: {}, evidence: {} };

interface Job {
    status: string;
    results: { files: { url: string; expires_at: string; sha256: string }[] };
}

Deno.test("get-job returns a fresh link", async () => {
    const result = await h.run("completed", INPUT);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, ZERO);
    // the job as VOYGR returned it, link and all
    assertEquals(result.output, await h.recorded("completed"));
    const fresh = (result.output as unknown as Job).results.files[0];

    // the same job, as the run read it about a minute earlier: the same
    // file, behind a link that expires later
    const run = await loadFixture(fromFileUrl(
        new URL(
            "../validate-batch/fixtures/happy.json",
            import.meta.url,
        ),
    ));
    const earlier = (run.calls[2].res.body as unknown as Job).results.files[0];
    assertEquals(fresh.sha256, earlier.sha256);
    assert(
        Date.parse(fresh.expires_at) > Date.parse(earlier.expires_at),
        `${fresh.expires_at} is not later than ${earlier.expires_at}`,
    );
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

Deno.test("get-job schema: batch_id is required and non-empty", async () => {
    const unit = await testSealedUnit(ID);
    const rejected: [string, RunInput][] = [
        ["no path params", {}],
        ["no batch_id", { pathParams: {} }],
        ["empty batch_id", { pathParams: { batch_id: "" } }],
        ["a typo'd key", { pathParams: { batchid: BATCH } }],
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
        input: INPUT,
        mode: "replay",
        fixture: await h.fixture("completed"),
        resources: [OWNED],
    });
});

Deno.test("get-job declares the sub-account binding", () => h.assertBinding());

Deno.test("get-job fails closed without a sub-account", () =>
    h.assertFailsClosed(INPUT));

Deno.test("get-job sends a bodyless GET with the workspace's sub-account", () =>
    h.assertOnTheWire(INPUT, {
        method: "GET",
        url: `https://api.voygr.tech/v1/jobs/${BATCH}`,
    }));

Deno.test("get-job encodes the batch id into one path segment", () =>
    h.assertOnTheWire({ pathParams: { batch_id: "a/b?c" } }, {
        method: "GET",
        url: "https://api.voygr.tech/v1/jobs/a%2Fb%3Fc",
    }));

Deno.test({
    name: "voygr#get-job live: an unknown batch_id is a 404 at zero",
    ignore: liveSkip("voygr"),
    fn: async () => {
        // a read of a job that is not this workspace's: no job is touched
        const result = await h.live({
            pathParams: { batch_id: "batch_00000000000000000000000000000000" },
        });
        assertEquals(result.httpStatus, 404, JSON.stringify(result));
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, ZERO);
    },
});
