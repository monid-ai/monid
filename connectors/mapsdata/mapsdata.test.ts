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

/**
 * The mapsdata suite (fixture strategy v2): provider-level chains under
 * `fixtures/`, bound per endpoint through `{{request.url}}`. Every fixture is
 * `synthetic-` until `deno task record` runs against a real key.
 */

const chains = fromFileUrl(new URL("./fixtures/", import.meta.url));
const chain = (name: string) => loadFixture(`${chains}${name}.json`);

const JOBS = "mapsdata#jobs";
const SCRAPE: RunInput = {
    body: {
        query: "Plumber",
        cities: [{ city: "Austin", state: "Texas" }],
        total_limit: 50,
    },
};

const run = async (id: string, input: RunInput, fixture: string) =>
    runEndpoint({
        unit: await testSealedUnit(id),
        input,
        mode: "replay",
        fixture: await chain(fixture),
    });

// --- provenance -------------------------------------------------------------

Deno.test("mapsdata: one leads pool, bearer auth, the v1 base url", async () => {
    const bundle = await testBundle();
    const provider = bundle.providers["mapsdata"];
    assert(provider, "mapsdata provider compiled");
    assertEquals(
        Object.keys(bundle.endpoints).filter((id) => id.startsWith("mapsdata#"))
            .sort(),
        [
            "mapsdata#categories",
            "mapsdata#categories/validate",
            "mapsdata#jobs",
            "mapsdata#regions",
        ],
    );
    assertEquals(
        bundle.endpoints[JOBS].request.url,
        "https://mapsdata.ai/api/v1/jobs",
    );
});

Deno.test("mapsdata: only /jobs carries a lifecycle", async () => {
    const bundle = await testBundle();
    assert(bundle.endpoints[JOBS].lifecycle?.poll, "jobs is async");
    for (
        const id of [
            "mapsdata#categories",
            "mapsdata#categories/validate",
            "mapsdata#regions",
        ]
    ) {
        assertEquals(bundle.endpoints[id].lifecycle, undefined, id);
    }
});

// --- mapsdata#jobs ----------------------------------------------------------

Deno.test("mapsdata#jobs: polls to completed, fetches the CSV, settles on email_count", async () => {
    const result = await run(JOBS, SCRAPE, "synthetic-job-succeeded");

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 2 },
        evidence: { RESULT: 2 },
    });
    assertEquals(result.usage.mismatch, undefined);

    const output = result.output as {
        job: Record<string, unknown>;
        leads: Record<string, string>[];
    };
    assertEquals(output.job.id, "JOB1");
    assertEquals(output.job.stop_reason, "coverage_exhausted");
    assertEquals(output.leads.length, 2);
    // the BOM is stripped from the first header
    assertEquals(Object.keys(output.leads[0])[0], "query");
    // a quoted comma stays inside its field
    assertEquals(
        output.leads[0].categories,
        "Plumber, Water heater installation service",
    );
    assertEquals(output.leads[0].email, "info@example-plumbing.example.com");
    // doubled quotes unescape, an embedded newline survives
    assertEquals(output.leads[1].name, 'The "Best" Drains');
    assertEquals(
        output.leads[1].address,
        "200 Sample Ave\nSuite 4, Austin, TX 78702",
    );
    // an empty cell is an empty string, not a dropped key
    assertEquals(output.leads[1].working_hours, "");
    assertEquals(output.leads[1].zip_code, "78702");
});

Deno.test("mapsdata#jobs: transient status and download failures keep the run alive", async () => {
    const result = await run(JOBS, SCRAPE, "synthetic-job-transient");

    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.credits, { default: 2 });
    assertEquals(
        (result.output as { leads: unknown[] }).leads.length,
        2,
    );
});

Deno.test("mapsdata#jobs: a completed job with no emails returns no leads and bills 0", async () => {
    const result = await run(JOBS, SCRAPE, "synthetic-job-no-emails");

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // the chain lists no download call: fetching one would fail the replay
    assertEquals((result.output as { leads: unknown[] }).leads, []);
    assertEquals(result.usage.evidence, { RESULT: 0 });
    assertEquals(result.usage.credits, {});
});

Deno.test("mapsdata#jobs: a failed scrape is zero-billed error data with the vendor's reason", async () => {
    const result = await run(JOBS, SCRAPE, "synthetic-job-failed");

    assertEquals(result.httpStatus, 500);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as { message: string; code: string };
    assertEquals(
        output.message,
        "The scrape stopped unexpectedly. No leads were billed.",
    );
    assertEquals(output.code, "job_failed");
});

Deno.test("mapsdata#jobs: a rejected submit is data, never a job", async () => {
    const result = await run(
        JOBS,
        {
            body: {
                query: "plumbers near me",
                states: ["Texas"],
                total_limit: 50,
            },
        },
        "synthetic-submit-rejected",
    );

    assertEquals(result.httpStatus, 400);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as {
        message: string;
        code: string;
        field: string;
    };
    assertEquals(output.code, "unsupported_query");
    assertEquals(output.field, "query");
});

Deno.test("mapsdata#jobs: a 401 is data, zero usage", async () => {
    const result = await run(JOBS, SCRAPE, "synthetic-unauthorized");

    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as { code: string }).code,
        "invalid_api_key",
    );
});

Deno.test("mapsdata#jobs: dry_run settles on the submit and bills 0", async () => {
    const result = await run(
        JOBS,
        { body: { ...SCRAPE.body as object, dry_run: true } },
        "synthetic-dry-run",
    );

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage.evidence, { RESULT: 0 });
    assertEquals(result.usage.credits, {});
    assertEquals(
        (result.output as { would_create: boolean }).would_create,
        true,
    );
});

Deno.test("mapsdata#jobs: the estimate is total_limit, and 0 for a dry run", async () => {
    const unit = await testSealedUnit(JOBS);
    const promised = await estimateEndpoint(unit, SCRAPE);
    assertEquals(promised.evidence, { RESULT: 50 });
    assertEquals(promised.credits, { default: 50 });

    const dry = await estimateEndpoint(unit, {
        body: { ...SCRAPE.body as object, dry_run: true },
    });
    assertEquals(dry.credits, {});
});

Deno.test("mapsdata#jobs: schema gates", async () => {
    const unit = await testSealedUnit(JOBS);
    const fixture = await chain("synthetic-dry-run");
    const rejects = (body: Record<string, Json>) =>
        assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
        );
    // total_limit is the estimate's basis: required
    await rejects({ query: "Plumber", states: ["Texas"] });
    await rejects({ query: "Plumber", states: ["Texas"], total_limit: 0 });
    // only the four supported countries
    await rejects({
        query: "Plumber",
        states: ["Texas"],
        total_limit: 10,
        country: "de",
    });
    // client_id is deliberately not exposed (one shared workspace)
    await rejects({
        query: "Plumber",
        states: ["Texas"],
        total_limit: 10,
        client_id: "other",
    });
    // and the complement: a full, valid body clears validation
    await assertInputAccepted({
        unit,
        input: {
            body: {
                query: "Plumber, Electrician",
                country: "ca",
                states: ["Ontario"],
                total_limit: 25,
                max_emails_per_company: 1,
                min_reviews: 5,
                max_reviews: 500,
                list_name: "Ontario trades",
                include_variants: false,
                dry_run: true,
            },
        },
        mode: "replay",
        fixture,
    });
});

// --- lookups ----------------------------------------------------------------

Deno.test("mapsdata#categories/validate: resolves a term, free", async () => {
    const result = await run(
        "mapsdata#categories/validate",
        { queryParams: { name: "plumbers" } },
        "synthetic-categories-validate-ok",
    );
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as { canonical: string }).canonical,
        "Plumber",
    );
});

Deno.test("mapsdata#categories: searches, free, q required", async () => {
    const result = await run(
        "mapsdata#categories",
        { queryParams: { q: "plumb" } },
        "synthetic-categories-ok",
    );
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as { data: unknown[] }).data.length,
        2,
    );

    const unit = await testSealedUnit("mapsdata#categories");
    await assertRejects(
        async () =>
            runEndpoint({
                unit,
                input: { queryParams: {} },
                mode: "replay",
                fixture: await chain("synthetic-categories-ok"),
            }),
        Error,
        "INVALID_INPUT",
    );
});

Deno.test("mapsdata#regions: lists a country's regions, free", async () => {
    const result = await run(
        "mapsdata#regions",
        { queryParams: { country: "ca" } },
        "synthetic-regions-ok",
    );
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as { regions: string[] }).regions[0],
        "Alberta",
    );
});

// --- live -------------------------------------------------------------------

Deno.test({
    name:
        "mapsdata live: category check and a dry run (shape only, spends nothing)",
    ignore: liveSkip("mapsdata"),
    fn: async () => {
        const check = await runEndpoint({
            unit: await testSealedUnit("mapsdata#categories/validate"),
            input: { queryParams: { name: "plumbers" } },
            mode: "live",
        });
        assertEquals(check.httpStatus, 200);
        assertEquals(
            typeof (check.output as { valid: boolean }).valid,
            "boolean",
        );

        const dry = await runEndpoint({
            unit: await testSealedUnit(JOBS),
            input: { body: { ...SCRAPE.body as object, dry_run: true } },
            mode: "live",
        });
        assertEquals(dry.httpStatus, 200);
        assertEquals(
            (dry.output as { would_create: boolean }).would_create,
            true,
        );
        assertEquals(dry.usage.credits, {});
    },
});
