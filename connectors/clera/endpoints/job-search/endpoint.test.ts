import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

type Job = Record<string, unknown> & { url: string };

Deno.test("clera#job-search happy (recorded 2026-11-09): unwrapped, urls added, free", async () => {
    const unit = await testSealedUnit("clera#job-search");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                search_term: "backend engineer",
                cities: ["San Francisco"],
                per_page: 2,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });

    const output = result.output as { total_jobs: number; top_jobs: Job[] };
    const recorded = (fixture.calls[0].res.body as {
        data: { total_jobs: number; top_jobs: Record<string, unknown>[] };
    }).data;
    assertEquals(output.total_jobs, recorded.total_jobs);
    assertEquals(output.top_jobs.length, recorded.top_jobs.length);
    for (const [i, job] of output.top_jobs.entries()) {
        const source = recorded.top_jobs[i];
        assertEquals(
            job.url,
            `https://www.getclera.com/jobs/${source.company_slug}/${source.slug}`,
        );
        const { url: _url, ...rest } = job;
        assertEquals(rest, source);
    }
});

Deno.test("clera#job-search provider error (recorded 2026-11-09): 400 is data, zero usage", async () => {
    const unit = await testSealedUnit("clera#job-search");
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { search_term: "anything" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("clera#job-search rejects an unknown filter before the wire", async () => {
    const unit = await testSealedUnit("clera#job-search");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    let rejected = false;
    try {
        await runEndpoint({
            unit,
            input: { body: { search_term: "x", seniority: "senior" } },
            mode: "replay",
            fixture,
        });
    } catch {
        rejected = true;
    }
    assert(rejected, "strict body schema must reject unknown keys");
});
