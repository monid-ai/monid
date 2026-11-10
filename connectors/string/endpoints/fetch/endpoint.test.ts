import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import { directTransport, Engine } from "@monid/connector-engine";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("string#fetch happy: a Markdown read settles at the request-standard line", async () => {
    const unit = await testSealedUnit("string#fetch");
    const fixture = await loadFixture(`${fixturesDir}fetch-example.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { url: "https://example.com" } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.0002 },
        evidence: { request_standard: 1 },
    });
    assertEquals(typeof result.output, "string");
    assertEquals(
        (result.output as string).startsWith("# Example Domain"),
        true,
    );
});

Deno.test("string#fetch happy: browser_premium settles at the browser-premium line, not the cheap-floor estimate", async () => {
    const unit = await testSealedUnit("string#fetch");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-fetch-browser-premium.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { url: "https://example.test", executeJS: true } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.isProviderError, false);
    // settle reflects the ACTUAL billed type from the response header, not
    // the estimate's cheaper-standard-proxy floor for a browser-forced call
    assertEquals(result.usage, {
        credits: { default: 0.004 },
        evidence: { browser_premium: 1 },
    });
});

Deno.test("string#fetch happy: a Google results URL answered through Search settles at the search rate", async () => {
    const unit = await testSealedUnit("string#fetch");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-fetch-google-search.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                url: "https://www.google.com/search?q=model+context+protocol",
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.001 },
        evidence: { search: 1 },
    });
});

Deno.test("string#fetch happy: absent billed-type header settles zero usage, not a guess", async () => {
    const unit = await testSealedUnit("string#fetch");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-fetch-header-absent.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { url: "https://example.com" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("string#fetch happy: unrecognized billed-type header settles zero usage, not a guess", async () => {
    const unit = await testSealedUnit("string#fetch");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-fetch-header-unrecognized.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { url: "https://example.com" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("string#fetch provider error (synthetic 502): zero usage", async () => {
    const unit = await testSealedUnit("string#fetch");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-fetch-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { url: "https://example.com" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 502);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

/** The JSON body the engine sends to String for one run. */
const sentBody = async (body: Json): Promise<unknown> => {
    const sent: unknown[] = [];
    const loaded = await new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (_input, init) => {
                sent.push(JSON.parse(String(init?.body)));
                return Promise.resolve(
                    new Response(JSON.stringify("# Example Domain"), {
                        status: 200,
                        headers: {
                            "content-type": "application/json",
                            "x-billed-request-type": "request_standard",
                        },
                    }),
                );
            },
        }),
    }).load(await testSealedUnit("string#fetch"));
    await loaded.run({ body });
    assertEquals(sent.length, 1);
    return sent[0];
};

Deno.test("string#fetch: a plain read goes out as Markdown with challenge solving off", async () => {
    assertEquals(await sentBody({ url: "https://example.com" }), {
        url: "https://example.com",
        format: "markdown",
        solveCaptcha: false,
    });
    // the caller can still ask for either
    assertEquals(
        await sentBody({
            url: "https://example.com",
            format: "json",
            solveCaptcha: true,
        }),
        { url: "https://example.com", format: "json", solveCaptcha: true },
    );
});

Deno.test("string#fetch: a GET only — no method, body, actions or extraction on the input", async () => {
    const unit = await testSealedUnit("string#fetch");
    const fixture = await loadFixture(`${fixturesDir}fetch-example.json`);
    const rejected: Json[] = [
        {},
        { url: "ftp://example.test/file" },
        { url: "https://" },
        { url: "https:///path" },
        { url: "https://example.test", method: "GET" },
        { url: "https://example.test", method: "POST", body: "{}" },
        { url: "https://example.test", body: "x" },
        { url: "https://example.test", actions: [{ type: "wait" }] },
        { url: "https://example.test", screenshot: true },
        { url: "https://example.test", jsonSchema: { type: "object" } },
        { url: "https://example.test", format: "html" },
        { url: "https://example.test", countryCode: "USA" },
        { url: "https://example.test", notAField: true },
    ];
    for (const body of rejected) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(body),
        );
    }
    // near-valid twins, one per exposed field, clear the gate
    const accepted: Json[] = [
        { url: "http://example.test/path?q=1" },
        { url: "https://example.test", format: "raw" },
        { url: "https://example.test", executeJS: true },
        { url: "https://example.test", headers: { "Accept-Language": "en" } },
        { url: "https://example.test", countryCode: "gb" },
        { url: "https://example.test", solveCaptcha: true },
    ];
    for (const body of accepted) {
        await assertInputAccepted({
            unit,
            input: { body },
            mode: "replay",
            fixture,
        });
    }
});

Deno.test("string#fetch: shares its lifecycle and evidence fns with string#request", async () => {
    const fetchDoc = (await testSealedUnit("string#fetch")).doc;
    const requestDoc = (await testSealedUnit("string#request")).doc;
    assertEquals(fetchDoc.lifecycle?.start, requestDoc.lifecycle?.start);
    assertEquals(fetchDoc.usage.evidence, requestDoc.usage.evidence);
});

Deno.test({
    name: "string#fetch live (gated on STRING_API_KEY)",
    ignore: liveSkip("string"),
    fn: async () => {
        const unit = await testSealedUnit("string#fetch");
        const result = await runEndpoint({
            unit,
            input: { body: { url: "https://example.com" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // whichever line fired, exactly one component should have settled
        const evidenceKeys = Object.keys(result.usage.evidence);
        assertEquals(evidenceKeys.length, 1);
        assertEquals(typeof result.usage.credits.default, "number");
        assertEquals(typeof result.output, "string");
    },
});
