import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "fuse#prospects/search";
const QUERY = "VPs of sales at fintech companies in New York";

const run = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("fuse#prospects/search: a page bills the rows it returned, without the workspace fields", async () => {
    // A short page: the default size is asked and two rows come back, so only
    // the rows returned may be billed.
    const result = await run("prospects-search.json", {
        query: QUERY,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 2 },
        evidence: { RESULT: 2 },
    });
    const output = result.output as Record<string, unknown>;
    const profiles = output.profiles as Record<string, unknown>[];
    assertEquals(profiles.length, 2);
    for (const profile of profiles) {
        for (
            const field of [
                "savedProfile",
                "savedBy",
                "linkedinConnectedAccountIds",
                "linkedinInvitationSentAccountIds",
            ]
        ) {
            assertEquals(field in profile, false, field);
        }
    }
    assertEquals(profiles[0].linkedin_url, "linkedin.com/in/ada-fielding");
    assertEquals(output.scrollToken, "st_recorded_page_2");
});

Deno.test("fuse#prospects/search: an unresolved filter value is zero-billed data naming the filter", async () => {
    const result = await run("synthetic-prospects-search-unresolved.json", {
        filters: {
            job_company_name: [{
                status: "include",
                value: "Northwind Paymnts",
            }],
        },
    });
    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.code, "FILTER_VALUE_UNRESOLVED");
    assertEquals(output.param, "filters.job_company_name");
});

Deno.test("fuse#prospects/search estimate: the page size, 10 unless asked", async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(
        (await estimateEndpoint(unit, { body: { query: QUERY } })).credits,
        { default: 10 },
    );
    assertEquals(
        (await estimateEndpoint(unit, { body: { query: QUERY, size: 25 } }))
            .credits,
        { default: 25 },
    );
});

Deno.test("fuse#prospects/search: the gate rejects a saved search and a bad entry status, and passes the entry", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}prospects-search.json`,
    );
    const refused: Json[] = [
        { savedSearchName: "VPs of sales" },
        { filters: { job_title_levels: [{ status: "maybe", value: "vp" }] } },
    ];
    for (const body of refused) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
        );
    }
    await assertInputAccepted({
        unit,
        input: {
            body: {
                filters: {
                    job_title_levels: [{ status: "include", value: "vp" }],
                },
            },
        },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name:
        "fuse#prospects/search live: a one-row page settles at most one result",
    ignore: liveSkip("fuse"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { body: { query: QUERY, size: 1 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const output = result.output as Record<string, unknown>;
        assert(Array.isArray(output.profiles));
        assert((output.profiles as unknown[]).length <= 1);
        assert("filters" in output);
    },
});
