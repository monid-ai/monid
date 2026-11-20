import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json, RunInput } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const replay = async (id: string, input: RunInput, name?: string) =>
    await runEndpoint({
        unit: await testSealedUnit(id),
        input,
        mode: "replay",
        ...(name
            ? { fixture: await loadFixture(`${fixturesDir}${name}.json`) }
            : {}),
    });
const rejects = async (id: string, input: RunInput, why: string) =>
    await assertRejects(
        () => replay(id, input),
        Error,
        "INVALID_INPUT",
        why,
    );

const ID = "worklittle#jobs/search";

Deno.test("worklittle: 8 endpoints, one USD pool, bearer auth, ids pinned", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("worklittle#")
    ).sort();
    assertEquals(ids, [
        "worklittle#apply",
        "worklittle#apply/profile",
        "worklittle#apply/{id}",
        "worklittle#companies/search",
        "worklittle#cover-letters",
        "worklittle#jobs/salary-average",
        "worklittle#jobs/search",
        "worklittle#resumes",
    ]);
    const auth = bundle.endpoints[ID].auth.inject.$fn.key;
    const paid: Record<string, number> = {
        "worklittle#apply": 0.2,
        "worklittle#cover-letters": 0.01,
        "worklittle#resumes": 0.01,
    };
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.auth.inject.$fn.key, auth, id);
        assert(doc.request.url.startsWith("https://api.worklittle.com/"), id);
        const model = doc.usage.model;
        if (paid[id] === undefined) {
            assertEquals(model.kind, "FREE", id);
        } else {
            assertEquals(Object.keys(doc.usage.credits), ["default"], id);
            assertEquals(
                "consumes" in model ? model.consumes : undefined,
                { credit: "default", amount: paid[id] },
                id,
            );
        }
    }
    assertEquals(
        bundle.endpoints[ID].request.url,
        "https://api.worklittle.com/jobs",
    );
});

Deno.test("worklittle#jobs/search happy (synthetic): free, quota stripped", async () => {
    const result = await replay(ID, {
        queryParams: {
            title: "product manager",
            location: "Austin",
            visa_sponsorship: "yes",
            salary_min: 120000,
            limit: 2,
        },
    }, "synthetic-search-ok");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as {
        data: Array<{ id: string; description_text?: string }>;
        meta: Record<string, unknown>;
    };
    assertEquals(output.data.map((j) => j.id), [
        "synthetic-job-1",
        "synthetic-job-2",
    ]);
    assertEquals("quota" in output.meta, false);
    assertEquals(
        output.meta.next_cursor,
        "MTc2MTU3NzQ0NTpzeW50aGV0aWMtam9iLTI",
    );
});

Deno.test("worklittle#jobs/search: 401 and 429 QUOTA_EXCEEDED are data, zero usage", async () => {
    const unauthorized = await replay(ID, {}, "synthetic-unauthorized");
    assertEquals(unauthorized.httpStatus, 401);
    assertEquals(unauthorized.isProviderError, true);
    assertEquals(unauthorized.usage, { credits: {}, evidence: {} });
    const quota = await replay(
        ID,
        { queryParams: { title: "nurse" } },
        "synthetic-quota-exceeded",
    );
    assertEquals(quota.httpStatus, 429);
    assertEquals(quota.usage, { credits: {}, evidence: {} });
    assertEquals((quota.output as { code: string }).code, "QUOTA_EXCEEDED");
});

Deno.test("worklittle#jobs/search: the schema rejects before the wire", async () => {
    const bad: Record<string, Json>[] = [
        { limit: 0 },
        { limit: 51 },
        { radius_km: 0 },
        { radius_km: 501 },
        { near_lat: 91 },
        { near_lng: -181 },
        { posted_within_days: -1 },
        { employment_type: "fulltime" },
        { seniority_level: "junior" },
        { visa_sponsorship: "maybe" },
        { sort: "best" },
        { cursor: "" },
        { salary_average: 1 },
        { include: "salary_average" },
        { summary: true },
    ];
    for (const queryParams of bad) {
        await rejects(ID, { queryParams }, JSON.stringify(queryParams));
    }
});

Deno.test({
    name: "worklittle#jobs/search live (gated on WORKLITTLE_API_KEY)",
    ignore: liveSkip("worklittle"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { queryParams: { title: "software engineer", limit: 2 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assert(Array.isArray((result.output as { data: unknown }).data));
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});

Deno.test("worklittle#jobs/search job_id (synthetic): one job in full, free", async () => {
    const result = await replay(
        ID,
        { queryParams: { job_id: "synthetic-job-1" } },
        "synthetic-get-ok",
    );
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const job = result.output as Record<string, unknown>;
    assertEquals(job.id, "synthetic-job-1");
    assert(String(job.description_text).includes("payments platform"));
});

Deno.test("worklittle#jobs/search job_id: 404 NOT_FOUND is data with the code lifted", async () => {
    const result = await replay(
        ID,
        { queryParams: { job_id: "no-such-job" } },
        "synthetic-get-not-found",
    );
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals((result.output as { code: string }).code, "NOT_FOUND");
});
