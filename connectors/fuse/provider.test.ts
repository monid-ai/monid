import { assert, assertEquals, assertMatch } from "@std/assert";
import type { RunInput } from "@shared/core";
import { testBundle, testSealedUnit } from "@shared/testing";
import { directTransport, Engine } from "@monid/connector-engine";

/**
 * Provider-wide facts, once (the per-endpoint suites cover each doc's own
 * behaviour): the identity set, the hooks every doc shares, and what goes
 * on the wire, which replay cannot show because it never records request
 * headers and never compares request bodies.
 */

const FUSE_IDS = [
    "fuse#companies/filter-options",
    "fuse#companies/search",
    "fuse#data/companies/count",
    "fuse#data/companies/people",
    "fuse#data/companies/resolve",
    "fuse#data/emails/verify",
    "fuse#data/people/contact-status",
    "fuse#data/people/count",
    "fuse#data/people/email",
    "fuse#data/people/enrich-jobs",
    "fuse#data/people/phone",
    "fuse#data/people/reverse-email",
    "fuse#data/people/reverse-phone",
    "fuse#prospects/filter-options",
    "fuse#prospects/search",
];

/** Run one endpoint against a fetch that answers `responses` in order,
 *  and return every request the engine sent. */
const wire = async (
    id: string,
    input: RunInput,
    responses: { status: number; body: unknown }[],
) => {
    const seen: {
        method: string;
        url: string;
        headers: Headers;
        body: unknown;
    }[] = [];
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "af_TESTKEY0123456789" }),
            fetch: (target, init) => {
                seen.push({
                    method: init?.method ?? "GET",
                    url: target instanceof Request
                        ? target.url
                        : String(target),
                    headers: new Headers(init?.headers),
                    body: init?.body
                        ? JSON.parse(String(init.body))
                        : undefined,
                });
                const next = responses[seen.length - 1];
                return Promise.resolve(
                    new Response(JSON.stringify(next.body), {
                        status: next.status,
                        headers: { "content-type": "application/json" },
                    }),
                );
            },
        }),
        sleep: () => Promise.resolve(),
    });
    const loaded = await engine.load(await testSealedUnit(id));
    await loaded.run(input);
    return seen;
};

Deno.test("fuse docs: fifteen ids, one inject, one receipt claim and one error digest", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("fuse#"))
        .sort();
    assertEquals(ids, FUSE_IDS);
    const first = bundle.endpoints[ids[0]];
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.auth.inject.$fn.key, first.auth.inject.$fn.key, id);
        assertEquals(
            doc.usage.consolidate?.$fn.key,
            first.usage.consolidate?.$fn.key,
            id,
        );
        assertEquals(
            doc.output.fromError?.$fn.key,
            first.output.fromError?.$fn.key,
            id,
        );
    }
    assert(
        bundle.fnTable[first.auth.inject.$fn.key].provenance.startsWith(
            "connectors/fuse/provider.ts",
        ),
    );
});

Deno.test("fuse: the key travels raw as `Basic af_…`, never base64", async () => {
    const [request] = await wire(
        "fuse#data/companies/resolve",
        { body: { domain: "northwind-payments.example" } },
        [{ status: 200, body: { status: "not_found", company: null } }],
    );
    assertEquals(
        request.url,
        "https://api.tryfuse.ai/api/v1/business/data/companies/resolve",
    );
    assertEquals(
        request.headers.get("authorization"),
        "Basic af_TESTKEY0123456789",
    );
});

Deno.test("fuse#data/people/enrich-jobs: the submit carries a run-stable idempotency key, the read follows the jobId", async () => {
    const jobId = "6a1f2c3d4e5f6a7b8c9d0e1f";
    const [submit, read] = await wire(
        "fuse#data/people/enrich-jobs",
        {
            body: {
                people: [{
                    linkedinUrl: "https://www.linkedin.com/in/ada-fielding",
                }],
                find: ["email"],
            },
        },
        [
            { status: 202, body: { jobId, status: "pending" } },
            {
                status: 200,
                body: {
                    jobId,
                    status: "completed",
                    total: 1,
                    processed: 1,
                    found: 0,
                    creditsCharged: 0,
                    rows: [],
                    stoppedReason: null,
                },
            },
        ],
    );
    assertEquals(submit.method, "POST");
    assertMatch(submit.headers.get("x-idempotency-key") ?? "", /^.+:submit$/);
    assertEquals(read.method, "GET");
    assertEquals(
        read.url,
        "https://api.tryfuse.ai/api/v1/business/data/people/enrich-jobs/" +
            jobId,
    );
    assertEquals(
        read.headers.get("authorization"),
        "Basic af_TESTKEY0123456789",
    );
});

Deno.test("fuse#data/people/count: a query count is repeated with the filters Fuse returned, never the query", async () => {
    const counted = {
        job_title_levels: [{ status: "include", value: "vp" }],
        job_title_role: [{ status: "include", value: "sales" }],
    };
    const pending = {
        status: "pending",
        total: null,
        filters: counted,
        creditsCharged: 0,
    };
    const [first, repeat] = await wire(
        "fuse#data/people/count",
        { body: { query: "VPs of sales" } },
        [
            { status: 202, body: { ...pending, unresolvedCriteria: [] } },
            { status: 200, body: { ...pending, status: "ready", total: 42 } },
        ],
    );
    assertEquals(first.body, { query: "VPs of sales" });
    assertEquals(repeat.method, "POST");
    assertEquals(repeat.url, first.url);
    assertEquals(repeat.body, { filters: counted });
});

Deno.test("fuse#data/companies/count: a query count is repeated with the filters Fuse returned, never the query", async () => {
    const counted = {
        crunchbaseCategoryGroups: ["Financial Services"],
        headquartersCity: ["New York, New York, United States"],
    };
    const pending = {
        status: "pending",
        total: null,
        filters: counted,
        creditsCharged: 0,
    };
    const [first, repeat] = await wire(
        "fuse#data/companies/count",
        { body: { query: "fintech companies in New York" } },
        [
            { status: 202, body: { ...pending, unresolvedCriteria: [] } },
            { status: 200, body: { ...pending, status: "ready", total: 42 } },
        ],
    );
    assertEquals(first.body, { query: "fintech companies in New York" });
    assertEquals(repeat.method, "POST");
    assertEquals(repeat.url, first.url);
    assertEquals(repeat.body, { filters: counted });
});
