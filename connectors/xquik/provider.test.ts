import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { RunInput } from "@shared/core";
import {
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const HERE = fromFileUrl(new URL("./", import.meta.url));

/**
 * Xquik's published price, $0.00015 per returned tweet, profile or
 * follower (https://xquik.com, 2026-11-14), per endpoint on its happy
 * fixture. Written as literals so the test can't follow a wrong model. A
 * new endpoint must state its row here.
 */
const RATE: Record<
    string,
    { folder: string; input: RunInput; usage: Record<string, unknown> }
> = {
    "xquik#x/tweets/search": {
        folder: "tweets-search",
        input: {
            queryParams: { q: "from:NASA", retweets: "exclude", limit: 2 },
        },
        usage: { credits: { default: 0.0003 }, evidence: { RESULT: 2 } },
    },
    "xquik#x/tweets/{id}": {
        folder: "tweet",
        input: { pathParams: { id: "2121280846183137564" } },
        usage: { credits: { default: 0.00015 }, evidence: { CALL: 1 } },
    },
    "xquik#x/users/search": {
        folder: "users-search",
        input: { queryParams: { q: "NASA", pageSize: 2 } },
        usage: { credits: { default: 0.0003 }, evidence: { RESULT: 2 } },
    },
    "xquik#x/users/{id}": {
        folder: "user",
        input: { pathParams: { id: "NASA" } },
        usage: { credits: { default: 0.00015 }, evidence: { CALL: 1 } },
    },
    "xquik#x/users/{id}/tweets": {
        folder: "user-tweets",
        input: {
            pathParams: { id: "NASA" },
            queryParams: { retweets: "exclude", pageSize: 2 },
        },
        usage: { credits: { default: 0.0003 }, evidence: { RESULT: 2 } },
    },
    "xquik#x/users/{id}/followers": {
        folder: "user-followers",
        input: { pathParams: { id: "NASA" }, queryParams: { pageSize: 2 } },
        usage: { credits: { default: 0.0003 }, evidence: { RESULT: 2 } },
    },
    "xquik#x/users/{id}/following": {
        folder: "user-following",
        input: { pathParams: { id: "NASA" }, queryParams: { pageSize: 2 } },
        usage: { credits: { default: 0.0003 }, evidence: { RESULT: 2 } },
    },
};

const xquikIds = async (): Promise<string[]> => {
    const bundle = await testBundle();
    return Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("xquik#"))
        .sort();
};

Deno.test("xquik: the literal rate table covers exactly the compiled endpoints", async () => {
    const ids = await xquikIds();
    assertEquals(ids.length, 7);
    assertEquals(ids, Object.keys(RATE).sort());
});

Deno.test("xquik: every happy run settles its published draw and returns Xquik's body unchanged", async () => {
    for (const [id, { folder, input, usage }] of Object.entries(RATE)) {
        const fixture = await loadFixture(
            `${HERE}endpoints/${folder}/fixtures/happy.json`,
        );
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input,
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200, id);
        assertEquals(result.isProviderError, false, id);
        assertEquals(result.usage, usage, id);
        assertEquals(result.output, fixture.calls[0].res.body, id);
    }
});

Deno.test("xquik: fn provenance, one inject, no consolidate, closed query schemas, one row counter per row key", async () => {
    const bundle = await testBundle();
    const ids = await xquikIds();
    const doc = (id: string) => bundle.endpoints[id];
    const inject = doc("xquik#x/users/{id}").auth.inject.$fn.key;
    for (const id of ids) {
        assertEquals(doc(id).auth.inject.$fn.key, inject, id);
        assertEquals(doc(id).usage.consolidate, undefined, id);
        assertEquals(doc(id).input.toRequest, undefined, id);
        assertEquals(doc(id).output.fromResponse, undefined, id);
        assertEquals(
            doc(id).input.schema.queryParams?.additionalProperties,
            false,
            id,
        );
        assertEquals(
            doc(id).request.url.startsWith("https://xquik.com/api/v1/x/"),
            true,
            id,
        );
    }
    const evidence = (id: string) => doc(id).usage.evidence.$fn.key;
    assertEquals(
        evidence("xquik#x/users/{id}/tweets"),
        evidence("xquik#x/tweets/search"),
    );
    assertEquals(
        evidence("xquik#x/users/{id}/following"),
        evidence("xquik#x/users/{id}/followers"),
    );
    assertEquals(
        evidence("xquik#x/users/search"),
        evidence("xquik#x/users/{id}/followers"),
    );
    assertEquals(
        evidence("xquik#x/tweets/{id}"),
        evidence("xquik#x/users/{id}"),
    );
});
