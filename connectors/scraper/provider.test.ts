import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import {
    assertInputAccepted,
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("./fixtures/", import.meta.url));

const PER_CALL = { CALL: 1 };

/**
 * Scraper's draw per endpoint: the vendor's per-tool "N credits" line in
 * https://scraper.run/docs, confirmed on every recording (the vendor's own
 * `meta.creditsUsed` equals the fold, so no `mismatch` key appears; zUsage
 * is strict, so deep equality proves it). Written as LITERALS on purpose:
 * deriving them from each doc's own model would make this test a
 * tautology. A new endpoint must state its row here.
 */
const RATE: Record<
    string,
    {
        fixture: string;
        input: RunInput;
        credits: number;
        evidence: Record<string, number>;
    }
> = {
    "scraper#indeed/jobs": {
        fixture: "indeed-jobs-ok",
        input: {
            body: {
                keyword: "registered nurse",
                location: "Austin, TX",
                maxItems: 2,
            },
        },
        credits: 1,
        evidence: PER_CALL,
    },
    "scraper#indeed/companies": {
        fixture: "indeed-companies-ok",
        input: { body: { keyword: "surgery partners", maxItems: 2 } },
        credits: 1,
        evidence: { RESULT: 2 },
    },
    "scraper#linkedin/jobs": {
        fixture: "linkedin-jobs-ok",
        input: {
            body: {
                keyword: "platform engineer",
                location: "Stockholm",
                maxItems: 3,
            },
        },
        credits: 1,
        evidence: PER_CALL,
    },
    "scraper#linkedin/job-detail": {
        fixture: "linkedin-job-detail-ok",
        input: { body: { jobId: "4456874869" } },
        credits: 1,
        evidence: PER_CALL,
    },
    "scraper#linkedin/post": {
        fixture: "linkedin-post-ok",
        input: {
            body: {
                url: "https://www.linkedin.com/feed/update/urn:li:activity:7000000000000000000",
                maxComments: 3,
            },
        },
        credits: 2,
        evidence: PER_CALL,
    },
    "scraper#glassdoor/jobs": {
        fixture: "glassdoor-jobs-ok",
        input: { body: { keyword: "software engineer", maxJobs: 3 } },
        credits: 2,
        evidence: PER_CALL,
    },
    "scraper#glassdoor/job-detail": {
        fixture: "glassdoor-job-detail-ok",
        input: { body: { jobId: 1010211603604 } },
        credits: 2,
        evidence: PER_CALL,
    },
    "scraper#glassdoor/company-jobs": {
        fixture: "glassdoor-company-jobs-ok",
        input: { body: { employerId: 7856, maxJobs: 2 } },
        credits: 2,
        evidence: PER_CALL,
    },
    "scraper#glassdoor/company-profile": {
        fixture: "glassdoor-company-profile-ok",
        input: {
            body: {
                employerUrl:
                    "https://www.glassdoor.com/Overview/Working-at-Rocket-EI_IE7856.11,17.htm",
            },
        },
        credits: 2,
        evidence: PER_CALL,
    },
    "scraper#glassdoor/company-reviews": {
        fixture: "glassdoor-company-reviews-ok",
        input: { body: { employerId: 7856, maxReviews: 2 } },
        credits: 2,
        evidence: PER_CALL,
    },
    "scraper#glassdoor/company-salaries": {
        fixture: "glassdoor-company-salaries-ok",
        input: { body: { employerId: 7856, maxSalaries: 3 } },
        credits: 2,
        evidence: PER_CALL,
    },
    "scraper#glassdoor/company-interviews": {
        fixture: "glassdoor-company-interviews-ok",
        input: { body: { employerId: 7856, maxInterviews: 2 } },
        credits: 2,
        evidence: PER_CALL,
    },
    "scraper#glassdoor/company-benefits": {
        fixture: "glassdoor-company-benefits-ok",
        input: { body: { employerId: 7856, maxBenefitReviews: 2 } },
        credits: 2,
        evidence: PER_CALL,
    },
    "scraper#naukri/jobs": {
        fixture: "naukri-jobs-ok",
        input: {
            body: {
                keyword: "data analyst",
                location: "Bengaluru",
                maxItems: 2,
            },
        },
        credits: 1,
        evidence: { call: 1, detail_enrichment: 0 },
    },
    "scraper#naukri/job-detail": {
        fixture: "naukri-job-detail-ok",
        input: { body: { jobId: "221026501100" } },
        credits: 2,
        evidence: PER_CALL,
    },
    "scraper#upwork/jobs": {
        fixture: "upwork-jobs-ok",
        input: {
            body: {
                keyword: "TypeScript developer",
                jobTypes: ["hourly"],
                sort: "recency",
                maxItems: 3,
            },
        },
        credits: 1,
        evidence: PER_CALL,
    },
    "scraper#upwork/job-detail": {
        fixture: "upwork-job-detail-ok",
        input: { body: { jobId: "~022113101893289196200" } },
        credits: 1,
        evidence: PER_CALL,
    },
};

Deno.test("scraper: every endpoint settles at its documented draw, and the meter leaves the output", async () => {
    for (const [id, row] of Object.entries(RATE)) {
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: row.input,
            mode: "replay",
            fixture: await loadFixture(`${chains}${row.fixture}.json`),
        });
        assertEquals(result.isProviderError, false, id);
        assertEquals(result.usage, {
            credits: { default: row.credits },
            evidence: row.evidence,
        }, id);
        const meta = (result.output as { meta: Record<string, Json> }).meta;
        assertEquals("creditsUsed" in meta, false, id);
        assertEquals(typeof meta.requestId, "string", id);
    }
});

Deno.test("scraper: Naukri fetchDetails adds the detail line, and the vendor meter agrees", async () => {
    const id = "scraper#naukri/jobs";
    const input = {
        body: {
            keyword: "data analyst",
            location: "Bengaluru",
            maxItems: 2,
            fetchDetails: true,
        },
    };
    const result = await runEndpoint({
        unit: await testSealedUnit(id),
        input,
        mode: "replay",
        fixture: await loadFixture(`${chains}naukri-jobs-details-ok.json`),
    });
    assertEquals(result.usage, {
        credits: { default: 2 },
        evidence: { call: 1, detail_enrichment: 1 },
    });
    assertEquals(await estimateEndpoint(await testSealedUnit(id), input), {
        credits: { default: 2 },
        evidence: { call: 1, detail_enrichment: 1 },
    });
});

Deno.test("scraper: a 401 problem body is data, zero usage, the message digested", async () => {
    const id = "scraper#indeed/jobs";
    const result = await runEndpoint({
        unit: await testSealedUnit(id),
        input: RATE[id].input,
        mode: "replay",
        fixture: await loadFixture(`${chains}unauthorized.json`),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as {
        message: string;
        raw: { code: string };
    };
    assertEquals(output.message, "Unauthorized");
    assertEquals(output.raw.code, "unauthorized");
});

Deno.test("scraper: indeed/companies bills per started block of 25 requested profiles", async () => {
    const unit = await testSealedUnit("scraper#indeed/companies");
    const credits = async (body: Record<string, Json>) =>
        (await estimateEndpoint(unit, { body })).credits.default;
    assertEquals(await credits({ keyword: "hospital", maxItems: 25 }), 1);
    assertEquals(await credits({ keyword: "hospital", maxItems: 26 }), 2);
    // the vendor default maxItems (50) is the search-mode basis
    assertEquals(await credits({ keyword: "hospital" }), 2);
    // lookup mode bills the listed keys and ignores maxItems
    assertEquals(
        await credits({
            companyKeys: Array.from({ length: 26 }, (_, i) => `company-${i}`),
            maxItems: 1,
        }),
        2,
    );
});

Deno.test("scraper: every body is strict, so a typo never reaches a paid call", async () => {
    for (const [id, row] of Object.entries(RATE)) {
        const unit = await testSealedUnit(id);
        const fixture = await loadFixture(`${chains}${row.fixture}.json`);
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: {
                        body: {
                            ...(row.input.body as Record<string, Json>),
                            not_a_scraper_param: "1",
                        },
                    },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
            id,
        );
        await assertInputAccepted({
            unit,
            input: row.input,
            mode: "replay",
            fixture,
        });
    }
});

Deno.test("scraper: a detail tool takes exactly one identifier", async () => {
    for (
        const [id, one, other] of [
            [
                "scraper#linkedin/job-detail",
                { jobId: "4456874869" },
                {
                    jobUrl:
                        "https://www.linkedin.com/jobs/view/software-engineer-at-example-4456874869",
                },
            ],
            [
                "scraper#naukri/job-detail",
                { jobId: "221026501100" },
                {
                    jobUrl:
                        "https://www.naukri.com/job-listings-data-analyst-example-bengaluru-221026501100",
                },
            ],
            [
                "scraper#upwork/job-detail",
                { jobId: "~022113101893289196200" },
                {
                    jobUrl:
                        "https://www.upwork.com/jobs/~022113101893289196200",
                },
            ],
        ] as const
    ) {
        const unit = await testSealedUnit(id);
        const fixture = await loadFixture(
            `${chains}${RATE[id].fixture}.json`,
        );
        await assertInputAccepted({
            unit,
            input: { body: other },
            mode: "replay",
            fixture,
        });
        for (const body of [{ ...one, ...other }, {}]) {
            await assertRejects(
                () =>
                    runEndpoint({
                        unit,
                        input: { body },
                        mode: "replay",
                        fixture,
                    }),
                Error,
                "INVALID_INPUT",
                id,
            );
        }
    }
});

Deno.test({
    name:
        "scraper live (gated on SCRAPER_API_KEY): the vendor meter agrees with the rate card",
    ignore: liveSkip("scraper"),
    fn: async () => {
        const id = "scraper#indeed/jobs";
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: {
                body: { keyword: "nurse", location: "Austin, TX", maxItems: 1 },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, {
            credits: { default: 1 },
            evidence: PER_CALL,
        });
    },
});
