import { assert, assertEquals } from "@std/assert";
import { directTransport, Engine } from "@monid/connector-engine";
import { loadFixture, testSealedUnit } from "@shared/testing";
import type { Json } from "@shared/core";

async function recordings() {
    const prefix = new URL("./fixtures/", import.meta.url);
    const original = await loadFixture(
        new URL("recorded-branches-aimode-current-share-url.json", prefix)
            .pathname,
    );
    const resolved = await loadFixture(
        new URL("recorded-branches-aimode-resolved-share-url.json", prefix)
            .pathname,
    );
    const short =
        (original.calls[0].req.body as { input: { url: string } }).input.url;
    const full =
        (resolved.calls[0].req.body as { input: { url: string } }).input.url;
    return { original, resolved, short, full };
}
Deno.test("AI share resolver: observed redirects + native API replay, exact shared URL and no Google credential", async () => {
    const { original, resolved, short, full } = await recordings();
    const intermediate = "https://www.google.com/share.google?q=aimode/" +
        short.split("/aimode/")[1];
    let reads = 0, api = 0, posts = 0;
    const engine = new Engine({
        sleep: () => Promise.resolve(),
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "SYNTHETIC_KEY" }),
            fetch: (url, init) => {
                const headers = new Headers(init?.headers);
                if (String(url).startsWith("https://api.scrapeless.com/")) {
                    const call = resolved.calls[api++];
                    assert(call);
                    assertEquals(String(url), call.req.url);
                    assertEquals(init?.method ?? "GET", call.req.method);
                    assertEquals(
                        init?.body === undefined
                            ? undefined
                            : JSON.parse(String(init.body)),
                        call.req.body,
                    );
                    assertEquals(headers.get("x-api-token"), "SYNTHETIC_KEY");
                    if (call.req.method === "POST") posts++;
                    return Promise.resolve(
                        Response.json(call.res.body, {
                            status: call.res.status,
                        }),
                    );
                }
                // Redirect responses are synthetic placement of observed native
                // headers; the API chain itself is a retained native recording.
                assertEquals(headers.has("x-api-token"), false);
                assertEquals(init?.method ?? "GET", "GET");
                assertEquals(String(url), reads++ === 0 ? short : intermediate);
                return Promise.resolve(
                    new Response("", {
                        status: 302,
                        headers: {
                            location: reads === 1 ? intermediate : full,
                        },
                    }),
                );
            },
        }),
    });
    const result =
        await (await engine.load(await testSealedUnit("scrapeless#ai/aimode")))
            .run({ body: original.calls[0].req.body! });
    assertEquals(reads, 2);
    assertEquals(api, resolved.calls.length);
    assertEquals(posts, 1);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.credits, { default: 0.0018 });
    assertEquals(
        (result.output as Record<string, Json>).provider_response,
        resolved.calls.at(-1)!.res.body,
    );
    assert(
        full.includes("smstk=") && full.includes("shmd=") &&
            full.includes("udm=50"),
        "All native share parameters retained, not just a substitute query",
    );
});
for (
    const scenario of [
        "foreign",
        "missing",
        "lost-mode",
        "cycle",
        "transport",
    ] as const
) {
    Deno.test(
        "AI share resolver: synthetic " + scenario +
            " fails before scraper submission",
        async () => {
            const { original, short } = await recordings();
            let calls = 0;
            const loaded = await new Engine({
                transport: directTransport({
                    params: () => Promise.resolve({ apiKey: "SYNTHETIC_KEY" }),
                    fetch: (url, init) => {
                        calls++;
                        assertEquals(String(url), short);
                        assertEquals(
                            new Headers(init?.headers).has("x-api-token"),
                            false,
                        );
                        assertEquals(init?.method ?? "GET", "GET");
                        if (scenario === "transport") {
                            return Promise.reject(
                                new Error("Synthetic Google read failure"),
                            );
                        }
                        const location = scenario === "foreign"
                            ? "https://example.com/steal"
                            : scenario === "lost-mode"
                            ? "https://www.google.com/search?q=test"
                            : scenario === "cycle"
                            ? short
                            : undefined;
                        return Promise.resolve(
                            new Response("", {
                                status: 302,
                                headers: location === undefined
                                    ? {}
                                    : { location },
                            }),
                        );
                    },
                }),
            }).load(await testSealedUnit("scrapeless#ai/aimode"));
            const result = await loaded.run({
                body: original.calls[0].req.body!,
            });
            assertEquals(calls, scenario === "cycle" ? 3 : 1);
            assertEquals(result.isProviderError, true);
            assertEquals(result.usage, { credits: {}, evidence: {} });
            assertEquals(
                (result.output as Record<string, Json>).submission_uncertain,
                false,
            );
            assertEquals(
                ((result.output as Record<string, Json>).raw as Record<
                    string,
                    Json
                >).stage,
                "share_link_resolution",
            );
        },
    );
}
