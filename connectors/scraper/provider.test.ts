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

/**
 * Identifier gates. The compiled schema is all the engine enforces, so each
 * row pairs inputs the vendor accepts (real URLs from the recordings, plus
 * the vendor's trimming and alternate forms) with near misses that must fail
 * before a paid call. The URL patterns mirror the vendor's own parsers, so
 * an `accept` row that fails here means the mirror is stricter than the
 * vendor.
 */
const GATES: Record<string, { accept: Json[]; reject: Json[] }> = {
    "scraper#linkedin/jobs": {
        accept: [
            { keyword: "platform engineer", location: "Stockholm" },
            { companyId: "1337" },
        ],
        reject: [
            {},
            { keyword: "platform engineer", companyId: "1337" },
            { companyId: "1337", location: "Stockholm" },
        ],
    },
    "scraper#linkedin/job-detail": {
        accept: [
            {
                jobUrl:
                    "https://www.linkedin.com/jobs/view/senior-platform-engineer-at-doktor-se-4456874869",
            },
            { jobUrl: " https://linkedin.com/jobs/view/4456874869/?trk=x\n" },
            { jobId: " 4456874869 " },
        ],
        reject: [
            {
                jobId: "4456874869",
                jobUrl: "https://www.linkedin.com/jobs/view/4456874869",
            },
            {},
            { jobUrl: "not-a-url" },
            { jobUrl: "https://example.com/jobs/view/4456874869" },
            {
                jobUrl:
                    "https://www.linkedin.com/jobs/view/senior-platform-engineer",
            },
        ],
    },
    "scraper#linkedin/post": {
        accept: [
            {
                url: "https://www.linkedin.com/feed/update/urn:li:activity:7000000000000000000",
            },
            {
                url: "https://www.linkedin.com/posts/example_hello-activity-7000000000000000000-AbCd",
            },
        ],
        reject: [
            { url: "https://www.linkedin.com/in/example" },
            { url: "https://www.linkedin.com/feed/" },
        ],
    },
    "scraper#glassdoor/job-detail": {
        accept: [
            {
                jobUrl:
                    "https://www.glassdoor.com/job-listing/software-engineer-i-rocket-companies-JV_IC1134644_KO0,19_KE20,36.htm?jl=1010211603604",
            },
            {
                jobUrl:
                    "https://www.glassdoor.co.uk/partner/jobListing.htm?pos=101&jobListingId=1010211603604",
            },
            { jobId: 1010211603604 },
        ],
        reject: [
            {},
            { jobUrl: "" },
            {
                jobUrl:
                    "https://example.com/job-listing/x.htm?jl=1010211603604",
            },
            {
                jobUrl:
                    "http://www.glassdoor.com/job-listing/x.htm?jl=1010211603604",
            },
            {
                jobUrl:
                    "https://www.glassdoor.com/job-listing/x-JV_IC1134644.htm",
            },
        ],
    },
    "scraper#naukri/job-detail": {
        accept: [
            {
                jobUrl:
                    "https://www.naukri.com/job-listings-data-analyst-rarr-technologies-bengaluru-8-to-12-years-221026501100",
            },
            {
                jobUrl:
                    "https://www.naukri.com/job-listings-x-221026501100/?src=a#b",
            },
            { jobId: " 221026501100 " },
        ],
        reject: [
            {
                jobId: "221026501100",
                jobUrl: "https://www.naukri.com/x-221026501100",
            },
            {},
            { jobUrl: "https://example.com/job-listings-x-221026501100" },
            { jobUrl: "https://www.naukri.com/jobs-in-bangalore" },
        ],
    },
    "scraper#upwork/job-detail": {
        accept: [
            {
                jobUrl:
                    "https://www.upwork.com/jobs/Upwork-Job_~022113101893289196200/",
            },
            {
                jobUrl:
                    "https://www.upwork.com/jobs/~022113101893289196200/?frkscc=abc123",
            },
            {
                jobUrl:
                    "https://www.upwork.com/freelance-jobs/apply/Example-Job_~022113101893289196200/",
            },
        ],
        reject: [
            {},
            {
                jobUrl:
                    "https://example.com/jobs/Upwork-Job_~022113101893289196200/",
            },
            {
                jobUrl:
                    "https://www.upwork.com/jobs/Upwork-Job_~022113101893289196200/#top",
            },
            {
                jobUrl:
                    "https://www.upwork.com/jobs/Upwork-Job_~022113101893289196200/?a=b",
            },
        ],
    },
    "scraper#upwork/jobs": {
        accept: [
            {
                searchUrl:
                    "https://www.upwork.com/nx/search/jobs/?q=react&sort=recency",
            },
        ],
        reject: [
            { searchUrl: "https://example.com/nx/search/jobs/?q=react" },
            { searchUrl: "https://www.upwork.com/nx/search/jobs/?q=react#top" },
        ],
    },
};

Deno.test("scraper: identifier fields take the vendor's forms and reject near misses before the call", async () => {
    for (const [id, gate] of Object.entries(GATES)) {
        const unit = await testSealedUnit(id);
        const fixture = await loadFixture(`${chains}${RATE[id].fixture}.json`);
        for (const body of gate.accept) {
            await assertInputAccepted({
                unit,
                input: { body },
                mode: "replay",
                fixture,
            });
        }
        for (const body of gate.reject) {
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
                `${id} ${JSON.stringify(body)}`,
            );
        }
    }
});

Deno.test({
    name:
        "scraper live (gated on SCRAPER_API_KEY): a real call settles with the vendor meter",
    ignore: liveSkip("scraper"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit("scraper#indeed/jobs"),
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
        // shape, not amounts: the replay table pins the credits, and a
        // vendor price change must not fail this live check
        assertEquals(typeof result.usage.credits.default, "number");
        assertEquals("mismatch" in result.usage, false);
    },
});
