import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import {
    type Fixture,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { runStrictReplay } from "./strict-replay.ts";

const cases = [
    ["google/search", "recorded-controls-google-offset-0"],
    ["google/search", "recorded-controls-google-offset-10"],
    ["google/search", "recorded-isolation-google-string-controls"],
    ["web-unlocker", "recorded-expansion-unlocker-header-only"],
    ["web-unlocker", "recorded-expansion-unlocker-render-keyboard"],
    ["web-unlocker", "recorded-isolation-network-settled-all"],
    ["web-unlocker", "recorded-isolation-network-settled-filter"],
    ["web-unlocker", "recorded-meter-explicit-outputs"],
    ["web-unlocker", "recorded-options-jpeg-selector"],
    ["web-unlocker", "recorded-options-png-selector"],
] as const;

const load = (name: string) =>
    loadFixture(new URL(`./fixtures/${name}.json`, import.meta.url).pathname);

async function strictReplay(id: string, fixture: Fixture, body: Json) {
    const result = await runStrictReplay(id, fixture, body);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.001 },
        evidence: { CALL: 1 },
    });
    const raw = (result.output as Record<string, Json>).provider_response;
    assertEquals(raw, fixture.calls.at(-1)!.res.body);
    return raw as Record<string, Json>;
}

for (const [id, name] of cases) {
    Deno.test(`formal option ${name}: exact recorded wire and native result, one charge`, async () => {
        const fixture = await load(name);
        const raw = await strictReplay(id, fixture, fixture.calls[0].req.body!);
        if (name.endsWith("png-selector") || name.endsWith("jpeg-selector")) {
            assert(typeof raw.data === "string");
            const bytes = Uint8Array.from(
                atob(raw.data),
                (c) => c.charCodeAt(0),
            );
            if (name.endsWith("png-selector")) {
                assertEquals([...bytes.slice(0, 8)], [
                    137,
                    80,
                    78,
                    71,
                    13,
                    10,
                    26,
                    10,
                ]);
                const view = new DataView(bytes.buffer);
                assertEquals([view.getUint32(16), view.getUint32(20)], [
                    220,
                    40,
                ]);
                assertEquals(
                    String.fromCharCode(...bytes.slice(-8, -4)),
                    "IEND",
                );
            } else {
                assertEquals([...bytes.slice(0, 3)], [255, 216, 255]);
                assertEquals([...bytes.slice(-2)], [255, 217]);
            }
        }
    });
}

Deno.test("formal network evidence: combined filters retain one of four captured events", async () => {
    const all = await load("recorded-isolation-network-settled-all");
    const filtered = await load("recorded-isolation-network-settled-filter");
    const frames = (f: Fixture) =>
        JSON.parse((f.calls.at(-1)!.res.body as { data: string }).data);
    const baseline = frames(all);
    const selected = frames(filtered);
    assertEquals(baseline.length, 4);
    assert(baseline.some((x: { method: string }) => x.method === "POST"));
    assert(baseline.some((x: { status: number }) => x.status === 418));
    assertEquals(selected.length, 1);
    assertEquals(selected[0].url, "https://httpbin.org/get?monid_isolate=keep");
    assertEquals(selected[0].method, "GET");
    assertEquals(selected[0].status, 200);
    // Combination evidence only, not proof of each filter independently.
});

for (
    const form of [
        "omitted-options",
        "omitted-outputs",
        "empty-array",
        "empty-string",
        "csv",
    ]
) {
    Deno.test(`formal synthetic input ${form}: normalize before one recorded explicit-all response`, async () => {
        const fixture = await load("recorded-meter-explicit-outputs");
        // Caller alternatives are synthetic; only the normalized wire and
        // response were actually recorded. Never relabel this as a new live call.
        const body = structuredClone(fixture.calls[0].req.body) as any;
        const response = body.input.jsRender.response;
        if (form === "omitted-options") delete response.options;
        if (form === "omitted-outputs") delete response.options.outputs;
        if (form === "empty-array") response.options.outputs = [];
        if (form === "empty-string") response.options.outputs = "";
        if (form === "csv") {
            response.options.outputs = response.options.outputs.join(",");
        }
        const raw = await strictReplay("web-unlocker", fixture, body);
        const content = JSON.parse(String(raw.data));
        assertEquals(Object.keys(content).length, 12);
        assertEquals(content.headings, ["Herman Melville - Moby-Dick"]);
    });
}

Deno.test("formal synthetic headers alias maps to recorded singular header before submission", async () => {
    const fixture = await load("recorded-expansion-unlocker-header-only");
    const body = structuredClone(fixture.calls[0].req.body) as any;
    body.input.headers = body.input.header;
    delete body.input.header;
    await strictReplay("web-unlocker", fixture, body);
});

Deno.test("formal conflicting header spellings rejected without any supplier request", async () => {
    const unit = await testSealedUnit("scrapeless#web-unlocker");
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    body: {
                        input: {
                            url: "https://example.com",
                            header: {},
                            headers: {},
                        },
                    },
                },
                mode: "replay",
            }),
        Error,
        "INVALID_INPUT",
    );
});
