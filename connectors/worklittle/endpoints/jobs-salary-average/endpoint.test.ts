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

const ID = "worklittle#jobs/salary-average";

Deno.test("worklittle#jobs/salary-average happy (synthetic): stats, free, quota stripped", async () => {
    const result = await replay(
        ID,
        { queryParams: { title: "data engineer", country: "US" } },
        "synthetic-salary-ok",
    );
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const out = result.output as {
        data: { average_salary: number; jobs_in_average: number };
        meta: Record<string, unknown>;
    };
    assertEquals(out.data.average_salary, 152340);
    assertEquals(out.data.jobs_in_average, 1851);
    assertEquals(out.meta, {});
});

Deno.test("worklittle#jobs/salary-average: q or title required; no search-only params", async () => {
    const bad: Record<string, Json>[] = [
        {},
        { country: "US" },
        { title: "x", near_lat: 30 },
        { title: "x", limit: 5 },
        { title: "x", posted_within_days: -1 },
        { title: "" },
        { q: "" },
        { title: "x", salary_min: -1 },
    ];
    for (const queryParams of bad) {
        await rejects(ID, { queryParams }, JSON.stringify(queryParams));
    }
    const ok = await replay(
        ID,
        { queryParams: { title: "data engineer", country: "US" } },
        "synthetic-salary-ok",
    );
    assertEquals(ok.isProviderError, false);
});

Deno.test("worklittle#jobs/salary-average: a provider error is data, zero usage", async () => {
    const result = await replay(
        ID,
        { queryParams: { title: "data engineer", country: "US" } },
        "synthetic-salary-unauthorized",
    );
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test({
    name: "worklittle#jobs/salary-average live (gated on WORKLITTLE_API_KEY)",
    ignore: liveSkip("worklittle"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: {
                queryParams: { title: "software engineer", country: "US" },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const data = (result.output as { data: Record<string, unknown> })
            .data;
        assertEquals(typeof data.jobs_in_average, "number");
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
