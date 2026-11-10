import { assert, assertEquals } from "@std/assert";
import { directTransport, Engine } from "@monid/connector-engine";
import type { Json } from "@shared/core";
import { type Fixture, testSealedUnit } from "@shared/testing";

/** Scrapeless's JSON-wire checks, beyond shared replay's URL/method matching. */
export async function runStrictReplay(
    id: string,
    fixture: Fixture,
    body?: Json,
) {
    assertEquals(
        fixture.calls.filter((call) => call.req.method === "POST").length,
        1,
        "Strict replay requires exactly one recorded submission",
    );
    const input = body === undefined ? fixture.calls[0]?.req.body : body;
    assert(input !== undefined, "Strict replay requires a submission body");
    const requests: { url: string; method: string; body?: string }[] = [];
    const loaded = await new Engine({
        sleep: () => Promise.resolve(),
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "SYNTHETIC_KEY" }),
            fetch: (url, init) => {
                const call = fixture.calls[requests.length];
                requests.push({
                    url: String(url),
                    method: init?.method ?? "GET",
                    body: init?.body === undefined
                        ? undefined
                        : String(init.body),
                });
                assert(call, "No unrecorded request or task resubmission");
                return Promise.resolve(Response.json(call.res.body, {
                    status: call.res.status,
                    headers: call.res.headers,
                }));
            },
        }),
    }).load(await testSealedUnit("scrapeless#" + id));
    const result = await loaded.run({ body: input });

    // Assert outside the transport: expected provider errors must not swallow
    // a wire mismatch and accidentally turn a broken replay into a passing test.
    assertEquals(
        requests.length,
        fixture.calls.length,
        "Strict replay call count",
    );
    for (const [index, actual] of requests.entries()) {
        const expected = fixture.calls[index].req;
        assertEquals(actual.url, expected.url, "Strict replay URL mismatch");
        assertEquals(
            actual.method,
            expected.method,
            "Strict replay method mismatch",
        );
        assertEquals(
            actual.body === undefined ? undefined : JSON.parse(actual.body),
            expected.body,
            "Strict replay body mismatch",
        );
    }
    assertEquals(
        requests.filter((request) => request.method === "POST").length,
        1,
        "Strict replay requires exactly one actual submission",
    );
    return result;
}
