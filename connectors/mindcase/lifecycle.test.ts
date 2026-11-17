import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import {
    assertInputAccepted,
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";
import { directTransport, Engine } from "@monid/connector-engine";

/**
 * THE mindcase test suite (fixture strategy v2): every endpoint shares one
 * async job protocol, so a handful of provider-level chains in fixtures/
 * exercise all of them. `test-inputs.json` holds one schema-valid body per
 * endpoint (generated from each agent's published sample input).
 */

const HERE = fromFileUrl(new URL("./", import.meta.url));
const INPUTS = JSON.parse(
    await Deno.readTextFile(`${HERE}test-inputs.json`),
) as Record<string, RunInput["body"]>;

const endpointIds = async (): Promise<string[]> => {
    const bundle = await testBundle();
    return Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("mindcase#"))
        .sort();
};

const run = async (id: string, fixture: string, body?: RunInput["body"]) =>
    await runEndpoint({
        unit: await testSealedUnit(id),
        input: { body: body ?? INPUTS[id.slice("mindcase#".length)] },
        mode: "replay",
        fixture: await loadFixture(`${HERE}fixtures/${fixture}.json`),
    });

Deno.test("mindcase: every endpoint has a test input", async () => {
    const ids = await endpointIds();
    assertEquals(ids.length, 101);
    for (const id of ids) {
        assert(INPUTS[id.slice("mindcase#".length)], `no test input for ${id}`);
    }
});

Deno.test("mindcase: every endpoint completes a job and settles on usd_used", async () => {
    for (const id of await endpointIds()) {
        const result = await run(id, "job-succeeded");
        assertEquals(result.httpStatus, 200, id);
        assertEquals(result.isProviderError, false, id);
        assertEquals(
            result.usage.credits,
            id === "mindcase#ycombinator/founders-dataset"
                ? {}
                : { default: 0.002 },
            id,
        );
        const output = result.output as {
            job_id: string;
            row_count: number;
            data: Json[];
            usd_used?: number;
        };
        assertEquals(output.row_count, 2, id);
        assertEquals(output.data.length, 2, id);
        // the claim is consolidated out of the payload
        assertEquals(output.usd_used, undefined, id);
    }
});

Deno.test("mindcase: an empty job settles at zero", async () => {
    const result = await run("mindcase#zepto/products", "synthetic-job-empty");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.credits, {});
    assertEquals((result.output as { data: Json[] }).data, []);
});

Deno.test("mindcase: a wallet-exhausted job bills its delivered rows and keeps the notice", async () => {
    const result = await run(
        "mindcase#zepto/products",
        "synthetic-wallet-exhausted",
    );
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 0.001 },
        evidence: { RESULT: 1 },
    });
    const output = result.output as { notice: string };
    assert(output.notice.includes("exhausted"));
});

Deno.test("mindcase: terminal failures are zero-billed errors", async () => {
    const cases: Array<[string, number, string]> = [
        ["synthetic-job-failed", 500, "Upstream source"],
        ["synthetic-job-cancelled", 409, "cancelled"],
        ["synthetic-rejected-balance", 402, "Insufficient balance"],
        ["synthetic-start-rejected", 401, "Invalid or missing API key"],
    ];
    for (const [fixture, status, message] of cases) {
        const result = await run("mindcase#zepto/products", fixture);
        assertEquals(result.httpStatus, status, fixture);
        assertEquals(result.isProviderError, true, fixture);
        assertEquals(result.usage, { credits: {}, evidence: {} }, fixture);
        const output = result.output as { message: string };
        assert(output.message.includes(message), fixture);
    }
});

Deno.test("mindcase: an unrecognized status keeps polling", async () => {
    const result = await run(
        "mindcase#zepto/products",
        "synthetic-unknown-status",
    );
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.credits, { default: 0.002 });
});

Deno.test("mindcase: inputs are sent under params", async () => {
    const sent: Json[] = [];
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (_input, init) => {
                sent.push(JSON.parse(String(init?.body)));
                return Promise.resolve(
                    new Response(JSON.stringify({ detail: "stop here" }), {
                        status: 401,
                        headers: { "content-type": "application/json" },
                    }),
                );
            },
        }),
    });
    const loaded = await engine.load(
        await testSealedUnit("mindcase#linkedin/jobs"),
    );
    await loaded.run({ body: { jobTitles: "AI Engineer", maxResults: 5 } });
    assertEquals(sent, [{
        params: { jobTitles: "AI Engineer", maxResults: 5 },
    }]);
});

Deno.test("mindcase: the input schema rejects before the wire", async () => {
    const unit = await testSealedUnit("mindcase#linkedin/jobs");
    const rejects = async (body: Json, why: string) => {
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
            why,
        );
    };
    await rejects({ jobTitles: "x", maxResults: 0 }, "0 means unlimited");
    await rejects({ jobTitles: "x" }, "the row cap is required");
    await rejects({ maxResults: 5 }, "jobTitles is required");
    await rejects({ jobTitles: "x", maxResults: 5, foo: 1 }, "unknown key");
    await rejects(
        { jobTitles: "x", maxResults: 5, sortBy: "newest" },
        "enum",
    );
    await assertInputAccepted({
        unit,
        input: { body: { jobTitles: "x", maxResults: 5, sortBy: "date" } },
        mode: "replay",
    });
});

Deno.test("mindcase: estimates price the row cap", async () => {
    const est = async (id: string, body: Json) =>
        await estimateEndpoint(await testSealedUnit(id), { body });
    // total cap: maxResults rows at $0.001, plus the flat $0.001 search fee
    assertEquals(
        (await est("mindcase#linkedin/jobs", {
            jobTitles: "x",
            maxResults: 100,
        })).credits,
        { default: 0.101 },
    );
    // per-input cap: 3 videos x 10 comments at $0.0005
    assertEquals(
        (await est("mindcase#tiktok/comments", {
            // one URL per line: a multi-line string is three inputs
            postURLs: "https://t.co/1\nhttps://t.co/2\n\nhttps://t.co/3",
            commentsPerPost: 10,
        })).evidence,
        { RESULT: 30 },
    );
    // by-URL profiles: one row per URL, no page fee
    assertEquals(
        (await est("mindcase#linkedin/profiles", {
            queries: ["a", "b"],
        })).evidence,
        { RESULT: 2 },
    );
    // people search: flat $0.05 search fee per run plus $0.004 per profile
    assertEquals(
        (await est("mindcase#linkedin/profiles/search", {
            searchQuery: "founder",
            maxProfiles: 50,
        })).evidence,
        { search_page: 1, profile: 50 },
    );
    // company employees: flat search fee plus profiles
    assertEquals(
        (await est("mindcase#linkedin/company-employees", {
            companies: ["https://www.linkedin.com/company/stripe"],
            maxResults: 10,
        })).evidence,
        { row: 10, search: 1 },
    );
    // maps images add-on only when maxImages > 0
    assertEquals(
        (await est("mindcase#google-maps/places", {
            keywords: "cafe",
            location: "Pune",
            maxResults: 10,
        })).evidence,
        { row: 10, max_images: 0 },
    );
    assertEquals(
        (await est("mindcase#google-maps/places", {
            keywords: "cafe",
            location: "Pune",
            maxResults: 10,
            maxImages: 2,
        })).evidence,
        { row: 10, max_images: 20 },
    );
    // per-domain cap: 2 domains x 10 emails
    assertEquals(
        (await est("mindcase#companies/emails", {
            domains: ["stripe.com", "ramp.com"],
            maxResults: 10,
        })).evidence,
        { RESULT: 20 },
    );
    // URL mode ignores maxResults: one row per product URL
    assertEquals(
        (await est("mindcase#linkedin/companies", {
            companies: [
                "https://www.linkedin.com/company/a",
                "https://www.linkedin.com/company/b",
            ],
            maxResults: 1,
        })).evidence,
        { RESULT: 2 },
    );
    // keyword search adds its flat per-run fee
    assertEquals(
        (await est("mindcase#amazon/products", {
            keywords: "keyboard",
            maxResults: 20,
        })).evidence,
        { row: 20, search_search: 1 },
    );
    // every input option is counted
    assertEquals(
        (await est("mindcase#companies/enrichment", {
            names: ["Stripe"],
            linkedinUrls: ["https://www.linkedin.com/company/stripe"],
        })).evidence,
        { RESULT: 2 },
    );
});

Deno.test("mindcase: zero row limits are rejected, never priced at $0", async () => {
    for (
        const [id, body] of [
            ["mindcase#companies/emails", {
                domains: ["stripe.com"],
                maxResults: 0,
            }],
            ["mindcase#google/play/reviews", {
                inputs: "org.telegram.messenger",
                maxResults: 0,
            }],
            ["mindcase#linkedin/posts-group", {
                urls: ["https://www.linkedin.com/groups/1"],
                maxResults: 0,
            }],
        ] as const
    ) {
        await assertRejects(
            async () =>
                await estimateEndpoint(await testSealedUnit(id), {
                    body: body as Json,
                }),
            Error,
            undefined,
            id,
        );
    }
});

Deno.test({
    name: "mindcase live: zepto/products returns rows and settles on usd_used",
    ignore: liveSkip("mindcase"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit("mindcase#zepto/products"),
            input: { body: INPUTS["zepto/products"] },
            mode: "live",
        });
        assertEquals(result.httpStatus, 200);
        const output = result.output as { data: Json[] };
        assert(output.data.length > 0);
        assertEquals(
            result.usage.credits.default,
            Math.round(output.data.length * 0.001 * 1e6) / 1e6,
        );
    },
});
