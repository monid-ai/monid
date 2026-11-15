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
 * Xquik's published draw, 1 credit per returned tweet, profile or
 * follower and 1 per lookup (https://xquik.com/openapi.yaml, 2026-11-15),
 * per endpoint on its happy fixture. The happy fixtures predate the
 * recorded meter header, so these runs settle on the derived fold. Written
 * as literals so the test can't follow a wrong model. A new endpoint must
 * state its row here.
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
        usage: { credits: { default: 2 }, evidence: { RESULT: 2 } },
    },
    "xquik#x/tweets/{id}": {
        folder: "tweet",
        input: { pathParams: { id: "2121280846183137564" } },
        usage: { credits: { default: 1 }, evidence: { CALL: 1 } },
    },
    "xquik#x/users/search": {
        folder: "users-search",
        input: { queryParams: { q: "NASA", pageSize: 2 } },
        usage: { credits: { default: 2 }, evidence: { RESULT: 2 } },
    },
    "xquik#x/users/{id}": {
        folder: "user",
        input: { pathParams: { id: "NASA" } },
        usage: { credits: { default: 1 }, evidence: { CALL: 1 } },
    },
    "xquik#x/users/{id}/tweets": {
        folder: "user-tweets",
        input: {
            pathParams: { id: "NASA" },
            queryParams: { retweets: "exclude", pageSize: 2 },
        },
        usage: { credits: { default: 2 }, evidence: { RESULT: 2 } },
    },
    "xquik#x/users/{id}/followers": {
        folder: "user-followers",
        input: { pathParams: { id: "NASA" }, queryParams: { pageSize: 2 } },
        usage: { credits: { default: 2 }, evidence: { RESULT: 2 } },
    },
    "xquik#x/users/{id}/following": {
        folder: "user-following",
        input: { pathParams: { id: "NASA" }, queryParams: { pageSize: 2 } },
        usage: { credits: { default: 2 }, evidence: { RESULT: 2 } },
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

Deno.test("xquik: fn provenance, one inject, one meter relay and claim, closed query schemas, one row counter per row key", async () => {
    const bundle = await testBundle();
    const ids = await xquikIds();
    const doc = (id: string) => bundle.endpoints[id];
    const reference = doc("xquik#x/users/{id}");
    const inject = reference.auth.inject.$fn.key;
    const relay = reference.lifecycle?.start?.$fn.key;
    const claim = reference.usage.consolidate?.$fn.key;
    assertEquals(typeof relay, "string");
    assertEquals(typeof claim, "string");
    for (const id of ids) {
        assertEquals(doc(id).auth.inject.$fn.key, inject, id);
        assertEquals(doc(id).lifecycle?.start?.$fn.key, relay, id);
        assertEquals(doc(id).usage.consolidate?.$fn.key, claim, id);
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

const METER = "x-xquik-credits-charged";

/** Each happy fixture with its response carrying `headers`, set here in
 *  memory. The values follow live reads on 2026-11-15, where every list
 *  page charged its row count, every lookup charged 1, and a page sent
 *  again with the same cursor charged 0. */
const runWithHeaders = async (
    id: string,
    headers: Record<string, string>,
) => {
    const { folder, input } = RATE[id];
    const fixture = await loadFixture(
        `${HERE}endpoints/${folder}/fixtures/happy.json`,
    );
    fixture.calls[0].res.headers = headers;
    const result = await runEndpoint({
        unit: await testSealedUnit(id),
        input,
        mode: "replay",
        fixture,
    });
    return { result, body: fixture.calls[0].res.body };
};

const charged = (usage: Record<string, unknown>) =>
    String((usage.credits as { default: number }).default);

Deno.test("xquik: the meter settles every read at the draw it reports", async () => {
    for (const [id, { usage }] of Object.entries(RATE)) {
        const { result, body } = await runWithHeaders(id, {
            [METER]: charged(usage),
        });
        assertEquals(result.httpStatus, 200, id);
        assertEquals(result.usage, usage, id);
        assertEquals(result.output, body, id);
    }
});

Deno.test("xquik: a list page the meter charged 0 settles 0 and still returns its rows", async () => {
    const lists = Object.entries(RATE).filter(([, { usage }]) =>
        "RESULT" in (usage.evidence as Record<string, number>)
    );
    assertEquals(lists.length, 5);
    for (const [id] of lists) {
        const { result, body } = await runWithHeaders(id, { [METER]: "0" });
        assertEquals(result.httpStatus, 200, id);
        assertEquals(result.usage, {
            credits: {},
            evidence: { RESULT: 0 },
        }, id);
        assertEquals(result.output, body, id);
    }
});

Deno.test("xquik: the meter wins over the rate card and the fold rides out as the mismatch", async () => {
    const { result } = await runWithHeaders("xquik#x/users/{id}/followers", {
        [METER]: "3",
    });
    assertEquals(result.usage, {
        credits: { default: 3 },
        evidence: { RESULT: 2 },
        mismatch: { derived: { default: 2 } },
    });
});

Deno.test("xquik: a malformed meter falls back to the rate card, never to a free page", async () => {
    for (
        const value of [
            "",
            " ",
            "-1",
            "NaN",
            "1e2",
            "0x0",
            "2x",
            "9007199254740992",
        ]
    ) {
        const { result } = await runWithHeaders(
            "xquik#x/users/{id}/tweets",
            { [METER]: value },
        );
        assertEquals(result.usage, {
            credits: { default: 2 },
            evidence: { RESULT: 2 },
        }, value);
    }
});

Deno.test("xquik: a provider error settles 0 whatever the meter reports", async () => {
    const fixture = await loadFixture(
        `${HERE}endpoints/user-tweets/fixtures/provider-error.json`,
    );
    fixture.calls[0].res.headers = { [METER]: "5" };
    const result = await runEndpoint({
        unit: await testSealedUnit("xquik#x/users/{id}/tweets"),
        input: { pathParams: { id: "xq_no_user_404" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
});
