import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, OwnedResource, RunInput } from "@shared/core";
import {
    Engine,
    EngineError,
    EngineErrorCode,
    type PreparedRequest,
} from "@monid/connector-engine";
import {
    fixtureReader,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

/**
 * THE runcloud suite. Chains are SYNTHETIC (no key was available while
 * porting): every response shape is lifted from the run.cloud SDK types and
 * the run.cloud API route that serves it, and each chain says what it
 * exercises. Ownership is the fixture's story: OWNED seeds the reader, and
 * a foreign id proves the uniform 404.
 */

const HERE = fromFileUrl(new URL("./", import.meta.url));
const fixture = (name: string) => loadFixture(`${HERE}fixtures/${name}.json`);

const OWNED: OwnedResource[] = [{
    resource: "runcloud/simulator-session",
    externalId: "sess-1",
    data: { platform: "ios" },
}];
const SESSION = { platform: "ios", sessionId: "sess-1" };

const IDS = [
    "runcloud#device-logs",
    "runcloud#get-session",
    "runcloud#open-url",
    "runcloud#press-button",
    "runcloud#press-key",
    "runcloud#read-screen",
    "runcloud#start-session",
    "runcloud#stop-session",
    "runcloud#swipe",
    "runcloud#tap",
    "runcloud#type-text",
];

/** A transport that records what the engine would send and answers one
 *  canned response: replay matches method + url only, so wire BODIES and
 *  headers are asserted here. */
function capture(status: number, body: Json) {
    const sent: PreparedRequest[] = [];
    const engine = new Engine({
        transport: {
            execute: (req) => {
                sent.push(req);
                return Promise.resolve({
                    status,
                    body: JSON.stringify(body),
                    headers: {},
                });
            },
        },
        resources: fixtureReader(OWNED),
    });
    return { engine, sent };
}

Deno.test("runcloud: eleven endpoints, all free, bearer auth, one projection fn on both output slots", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("runcloud#")
    ).sort();
    assertEquals(ids, IDS);
    const first = bundle.endpoints[IDS[0]];
    for (const id of IDS) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.usage.model.kind, "FREE", id);
        assertEquals(doc.meta.categories, ["mobile-simulators"], id);
        assert(doc.request.url.startsWith("https://api.run.cloud/run-cloud/"));
        assertEquals(doc.auth.inject.$fn.key, first.auth.inject.$fn.key, id);
        assertEquals(
            doc.output.fromError?.$fn.key,
            first.output.fromError?.$fn.key,
            id,
        );
    }
    // what drives the device USES it (each success marks a reconcile
    // tick); what only looks READS it; one endpoint each provisions and
    // releases
    const purposes: Record<string, string> = {
        "runcloud#device-logs": "reads",
        "runcloud#get-session": "reads",
        "runcloud#open-url": "uses",
        "runcloud#press-button": "uses",
        "runcloud#press-key": "uses",
        "runcloud#read-screen": "reads",
        "runcloud#start-session": "provisions",
        "runcloud#stop-session": "releases",
        "runcloud#swipe": "uses",
        "runcloud#tap": "uses",
        "runcloud#type-text": "uses",
    };
    for (const id of IDS) {
        const bindings = bundle.endpoints[id].resources ?? {};
        assertEquals(Object.keys(bindings), [purposes[id]], id);
    }
    // the strip is authored twice and interns to ONE entry
    const start = bundle.endpoints["runcloud#start-session"];
    assertEquals(
        start.output.fromResponse?.$fn.key,
        start.output.fromError?.$fn.key,
    );
    // the provider's money line is the resource's, never an endpoint's
    assertEquals(
        Object.keys(bundle.resources ?? {}).filter((id) =>
            id.startsWith("runcloud/")
        ),
        ["runcloud/simulator-session"],
    );
});

// ---------------------------------------------------------------------------
// start-session: the provision anchor
// ---------------------------------------------------------------------------

Deno.test("runcloud start-session: seeds the owned session and strips pooled internals, free run", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("runcloud#start-session"),
        input: { pathParams: { platform: "ios" }, body: {} },
        mode: "replay",
        fixture: await fixture("synthetic-start-session"),
    });
    assertEquals(result.httpStatus, 201);
    assertEquals(result.isProviderError, false);
    // the session's time is billed by the resource, never by this run
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.resources?.provisions, [{
        resource: "runcloud/simulator-session",
        externalId: "sess-1",
        data: { platform: "ios" },
    }]);
    const out = result.output as Record<string, Json>;
    assertEquals(out.id, "sess-1");
    assertEquals(out.platform, "ios");
    // the signed viewer url is the user's; the pooled org + lease are not
    assert(typeof out.url === "string");
    assertEquals(out.orgId, undefined);
    assertEquals(out.leaseId, undefined);
    assertEquals(out.device, undefined);
    assertEquals(out.hostId, undefined);
});

Deno.test("runcloud start-session: short timeouts by default and a run-stable Idempotency-Key", async () => {
    const response = (await fixture("synthetic-start-session")).calls[0].res;
    const { engine, sent } = capture(response.status, response.body);
    const loaded = await engine.load(
        await testSealedUnit("runcloud#start-session"),
    );
    const input = { pathParams: { platform: "android" }, body: {} };
    await loaded.start(input, { runId: "run-42" });
    assertEquals(sent.length, 1);
    assertEquals(sent[0].method, "POST");
    assertEquals(sent[0].url, "https://api.run.cloud/run-cloud/android");
    // a retried activity replays the SAME key, so run.cloud returns the
    // session the first attempt created instead of starting a second
    assertEquals(sent[0].headers["Idempotency-Key"], "run-42:start");
    assertEquals(sent[0].body, { inactivityTimeout: "5m", hardTimeout: "30m" });
});

Deno.test("runcloud start-session: no capacity is data, nothing provisioned", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("runcloud#start-session"),
        input: { pathParams: { platform: "ios" }, body: {} },
        mode: "replay",
        fixture: await fixture("synthetic-start-capacity"),
    });
    assertEquals(result.httpStatus, 503);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.resources, undefined);
});

Deno.test("runcloud start-session: a 2xx without a session id is an alarm, never 'nothing provisioned'", async () => {
    const error = await assertRejects(
        async () =>
            await runEndpoint({
                unit: await testSealedUnit("runcloud#start-session"),
                input: { pathParams: { platform: "ios" }, body: {} },
                mode: "replay",
                fixture: await fixture("synthetic-start-no-id"),
            }),
        EngineError,
    );
    assertEquals(
        (error as EngineError).code,
        EngineErrorCode.PROVISION_CONSTRUCT,
    );
});

Deno.test("runcloud start-session: the gate refuses an unbounded idle timeout and unknown fields", async () => {
    const unit = await testSealedUnit("runcloud#start-session");
    const inputs: RunInput[] = [
        {
            pathParams: { platform: "ios" },
            body: { inactivityTimeout: "none" },
        },
        {
            pathParams: { platform: "ios" },
            body: { hardTimeout: "forever" },
        },
        { pathParams: { platform: "ios" }, body: { tags: { a: "b" } } },
        { pathParams: { platform: "windows" }, body: {} },
        {
            pathParams: { platform: "ios" },
            body: { installAssets: Array(11).fill("asset") },
        },
    ];
    for (const input of inputs) {
        await assertRejects(
            () => runEndpoint({ unit, input, mode: "replay" }),
            Error,
            "INVALID_INPUT",
        );
    }
});

// ---------------------------------------------------------------------------
// session-scoped endpoints
// ---------------------------------------------------------------------------

Deno.test("runcloud: a FOREIGN session is the uniform 404 on every session endpoint, upstream untouched", async () => {
    const bodies: Record<string, Json> = {
        "runcloud#tap": { x: 0.5, y: 0.5 },
        "runcloud#swipe": { from: { x: 0.5, y: 0.8 }, to: { x: 0.5, y: 0.2 } },
        "runcloud#type-text": { text: "hello" },
        "runcloud#press-key": { key: "enter" },
        "runcloud#press-button": { button: "home" },
        "runcloud#open-url": { url: "https://example.com" },
    };
    for (const id of IDS.filter((id) => id !== "runcloud#start-session")) {
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: {
                pathParams: { platform: "ios", sessionId: "sess-FOREIGN" },
                ...(bodies[id] !== undefined ? { body: bodies[id] } : {}),
            },
            mode: "replay",
            // no fixture: the gate must fire before ANY upstream call
            resources: OWNED,
        });
        assertEquals(result.httpStatus, 404, id);
        assertEquals(result.isProviderError, true, id);
        assertEquals(result.usage.credits, {}, id);
    }
});

Deno.test("runcloud get-session: a live read, no settle marks", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("runcloud#get-session"),
        input: { pathParams: SESSION },
        mode: "replay",
        fixture: await fixture("synthetic-get-session"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals((result.output as Record<string, Json>).status, "active");
    assertEquals(result.resources, undefined);
});

Deno.test("runcloud stop-session: the DELETE runs now and the settle emits the release mark", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("runcloud#stop-session"),
        input: { pathParams: SESSION },
        mode: "replay",
        fixture: await fixture("synthetic-stop-session"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.resources?.releases, [{
        resource: "runcloud/simulator-session",
        externalId: "sess-1",
    }]);
    const out = result.output as Record<string, Json>;
    assertEquals(out.status, "released");
    assertEquals(out.leaseId, undefined);
});

Deno.test("runcloud tap: free, and a use marks the session for a reconcile tick", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("runcloud#tap"),
        input: { pathParams: SESSION, body: { x: 0.5, y: 0.78 } },
        mode: "replay",
        fixture: await fixture("synthetic-tap"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.resources?.reconciles, [{
        resource: "runcloud/simulator-session",
        externalId: "sess-1",
    }]);
    assertEquals((result.output as Record<string, Json>).status, "completed");
});

Deno.test("runcloud tap: a session that timed out upstream is data, no mark", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("runcloud#tap"),
        input: { pathParams: SESSION, body: { x: 0.5, y: 0.5 } },
        mode: "replay",
        fixture: await fixture("synthetic-interaction-session-gone"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.resources, undefined);
});

Deno.test("runcloud interactions: each endpoint sends its vendor action to /interactions", async () => {
    const cases: [string, Json, Json][] = [
        ["runcloud#tap", { x: 0.25, y: 1 }, { x: 0.25, y: 1, action: "tap" }],
        [
            "runcloud#swipe",
            { from: { x: 0.5, y: 0.75 }, to: { x: 0.5, y: 0.25 } },
            {
                from: { x: 0.5, y: 0.75 },
                to: { x: 0.5, y: 0.25 },
                action: "swipe",
            },
        ],
        [
            "runcloud#type-text",
            { text: "a@b.co\n" },
            { text: "a@b.co\n", action: "typeText" },
        ],
        [
            "runcloud#press-key",
            { key: "a", modifiers: ["meta"] },
            { key: "a", modifiers: ["meta"], action: "pressKey" },
        ],
        [
            "runcloud#press-button",
            { button: "home", durationMs: 500 },
            { button: "home", durationMs: 500, action: "pressButton" },
        ],
    ];
    for (const [id, body, wire] of cases) {
        const { engine, sent } = capture(200, { ok: true });
        const loaded = await engine.load(await testSealedUnit(id));
        await loaded.start({ pathParams: SESSION, body });
        assertEquals(sent.length, 1, id);
        assertEquals(sent[0].method, "POST", id);
        assertEquals(
            sent[0].url,
            "https://api.run.cloud/run-cloud/ios/sess-1/interactions",
            id,
        );
        assertEquals(sent[0].body, wire, id);
    }
});

Deno.test("runcloud interactions: the gate enforces the SDK's own bounds", async () => {
    const rejected: [string, Json][] = [
        ["runcloud#tap", { x: 1.2, y: 0.5 }],
        ["runcloud#tap", { x: 0.5 }],
        ["runcloud#swipe", {
            from: { x: 0, y: 0 },
            to: { x: 1, y: 1 },
            durationMs: 10,
        }],
        ["runcloud#type-text", { text: "café" }],
        ["runcloud#type-text", { text: "" }],
        ["runcloud#press-key", { key: "F1" }],
        ["runcloud#press-button", { button: "camera" }],
        ["runcloud#open-url", { url: "not a url" }],
    ];
    for (const [id, body] of rejected) {
        await assertRejects(
            async () =>
                await runEndpoint({
                    unit: await testSealedUnit(id),
                    input: { pathParams: SESSION, body },
                    mode: "replay",
                    resources: OWNED,
                }),
            Error,
            "INVALID_INPUT",
            `${id} ${JSON.stringify(body)}`,
        );
    }
});

Deno.test("runcloud read-screen: flat, screen-ordered, containers skipped, tap-ready centers", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("runcloud#read-screen"),
        input: { pathParams: SESSION },
        mode: "replay",
        fixture: await fixture("synthetic-read-screen"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    const out = result.output as Record<string, Json>;
    assertEquals(out.screen, { width: 400, height: 800, unit: "points" });
    assertEquals(out.truncated, false);
    assertEquals(out.nodeCount, 3);
    const nodes = out.nodes as Record<string, Json>[];
    assertEquals(nodes.map((node) => node.label), [
        "Sign in",
        "Email",
        "Continue",
    ]);
    assertEquals(nodes[0], {
        depth: 2,
        role: "heading",
        label: "Sign in",
        value: null,
        identifier: null,
        bounds: { x: 20, y: 101, width: 200, height: 40 },
        // (20.4 + 100) / 400, (100.6 + 20) / 800
        center: { x: 0.301, y: 0.151 },
        enabled: true,
        focused: null,
    });
    assertEquals(nodes[1].identifier, "email-input");
    assertEquals(nodes[1].focused, true);
    // (100 + 100) / 400, (600 + 25) / 800
    assertEquals(nodes[2].center, { x: 0.5, y: 0.781 });
    assertEquals(nodes[2].enabled, false);
});

Deno.test("runcloud read-screen: stops at 400 elements and says so", async () => {
    const leaf = (i: number) => ({
        role: "text",
        label: "row " + i,
        value: null,
        identifier: null,
        bounds: { x: 0, y: i, width: 10, height: 1 },
        states: { enabled: true, focused: null },
        children: [],
    });
    const result = await runEndpoint({
        unit: await testSealedUnit("runcloud#read-screen"),
        input: { pathParams: SESSION },
        mode: "replay",
        fixture: {
            name: "inline-450-rows",
            description: "A screen with 450 labelled rows under one list.",
            calls: [{
                req: {
                    method: "GET",
                    url: "{{request.origin}}/run-cloud/ios/sess-1/accessibility",
                },
                res: {
                    status: 200,
                    body: {
                        platform: "ios",
                        screen: { width: 10, height: 450, unit: "points" },
                        truncated: false,
                        roots: [{
                            role: "list",
                            label: null,
                            value: null,
                            identifier: null,
                            bounds: null,
                            states: { enabled: true, focused: null },
                            children: Array.from(
                                { length: 450 },
                                (_, i) => leaf(i),
                            ),
                        }],
                    },
                },
            }],
        },
        resources: OWNED,
    });
    const out = result.output as Record<string, Json>;
    assertEquals(out.nodeCount, 400);
    assertEquals(out.truncated, true);
    const nodes = out.nodes as Record<string, Json>[];
    assertEquals(nodes[0].label, "row 0");
    assertEquals(nodes[399].label, "row 399");
});

Deno.test("runcloud open-url: acknowledgement without the lease plumbing", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("runcloud#open-url"),
        input: { pathParams: SESSION, body: { url: "myapp://settings" } },
        mode: "replay",
        fixture: await fixture("synthetic-open-url"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.output, {
        ok: true,
        platform: "ios",
        sessionId: "sess-1",
        url: "myapp://settings",
    });
});

Deno.test("runcloud device-logs: the vendor's 200-line default rides on the wire", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("runcloud#device-logs"),
        input: { pathParams: SESSION },
        mode: "replay",
        // the chain's url carries ?tail=200: replay fails if it is absent
        fixture: await fixture("synthetic-device-logs"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    const out = result.output as Record<string, Json>;
    assertEquals((out.entries as Json[]).length, 2);
    await assertRejects(
        async () =>
            await runEndpoint({
                unit: await testSealedUnit("runcloud#device-logs"),
                input: { pathParams: SESSION, queryParams: { tail: 1001 } },
                mode: "replay",
                resources: OWNED,
            }),
        Error,
        "INVALID_INPUT",
    );
});
