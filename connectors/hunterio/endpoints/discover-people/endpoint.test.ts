import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import { directTransport, Engine } from "@monid/connector-engine";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "hunterio#discover/people";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const providerFixturesDir = fromFileUrl(
    new URL("../../fixtures/", import.meta.url),
);
const INPUT = { body: { industry: { include: ["Financial Services"] } } };

Deno.test(`${ID} happy (synthetic): free`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(`${ID} provider error (synthetic 401): zero usage, the errors envelope digested`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as { message: string; error_code: string };
    assertEquals(output.error_code, "invalid_api_key");
    assertEquals(output.message, "The API key is invalid.");
});

Deno.test(`${ID}: the schema gate — the vendor's rules and strictness`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const run = (input: Record<string, unknown>) =>
        runEndpoint({
            unit,
            input: { body: input as Record<string, Json> },
            mode: "replay",
            fixture,
        });
    for (
        const bad of [
            {},
            { offset: 0 },
            { query: "fintech" },
            {
                industry: { include: ["Financial Services"] },
                headcount: ["big"],
            },
        ]
    ) {
        await assertRejects(() => run(bad), Error, "INVALID_INPUT");
    }
    {
        // the near twin passes the gate and replays the happy chain (a
        // body field does not change the wire URL)
        const twin = await run({
            funding: { series: ["series_a"], amount: { from: 1000000 } },
            keywords: { include: ["payments"] },
        });
        assertEquals(twin.httpStatus, 200);
    }
});

Deno.test(`${ID}: hiring filters pass validation and remain free`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const bodies: Record<string, Json>[] = [
        { job_openings: { hiring: true } },
        { job_openings: { hiring: false } },
        {
            organization: { domain: ["hunter.io"] },
            job_openings: { hiring: true },
        },
        { job_openings: { department: ["engineering"] } },
        { job_openings: { posted_date: "last7d" } },
        { job_openings: { posted_date: "last30d" } },
        { job_openings: { posted_date: "last90d" } },
        { job_openings: { open_roles: { from: 0 } } },
        { job_openings: { open_roles: { to: 0 } } },
        { job_openings: { open_roles: { from: 1 } } },
        { job_openings: { open_roles: { to: 10 } } },
        {
            job_openings: {
                job_title: {
                    include: Array(100).fill("engineer"),
                    exclude: Array(100).fill("intern"),
                },
            },
        },
        {
            job_openings: {
                hiring: true,
                department: ["engineering"],
                job_title: { include: ["engineer"], exclude: ["intern"] },
                posted_date: "last30d",
                open_roles: { from: 1, to: 10 },
                include_closed_roles: true,
            },
        },
    ];

    for (const body of bodies) {
        const result = await runEndpoint({
            unit,
            input: { body },
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200);
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assertEquals(result.output, fixture.calls[0].res.body);
    }
});

Deno.test(`${ID}: malformed hiring filters fail before any HTTP request`, async () => {
    const unit = await testSealedUnit(ID);
    const invalid: Record<string, Json>[] = [
        { job_openings: {} },
        { job_openings: { hiring: "true" } },
        { job_openings: { department: "engineering" } },
        { job_openings: { department: [""] } },
        { job_openings: { posted_date: "last14d" } },
        { job_openings: { open_roles: { from: -1 } } },
        { job_openings: { open_roles: { to: -1 } } },
        { job_openings: { open_roles: { from: 1.5 } } },
        { job_openings: { open_roles: { to: "10" } } },
        { job_openings: { include_closed_roles: "false" } },
        {
            job_openings: {
                job_title: { include: Array(101).fill("engineer") },
            },
        },
        {
            job_openings: {
                job_title: { exclude: Array(101).fill("intern") },
            },
        },
    ];

    for (const body of invalid) {
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
        );
    }
});

Deno.test(`${ID}: sends hiring filters unchanged`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const body = {
        organization: { domain: ["hunter.io"] },
        job_openings: {
            hiring: true,
            department: ["engineering"],
            job_title: { include: ["engineer"], exclude: ["intern"] },
            posted_date: "last30d",
            open_roles: { from: 1, to: 10 },
            include_closed_roles: false,
        },
        limit: 1,
    };
    const sent: Json[] = [];
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (url, init) => {
                sent.push({
                    url: String(url),
                    method: init?.method ?? "GET",
                    body: JSON.parse(String(init?.body)),
                });
                return Promise.resolve(
                    new Response(
                        JSON.stringify(fixture.calls[0].res.body),
                        { status: 200 },
                    ),
                );
            },
        }),
    });
    const endpoint = await engine.load(unit);
    const result = await endpoint.run({ body });
    assertEquals(sent, [{
        url: `https://api.hunter.io/v2/${ID.split("#")[1]}`,
        method: "POST",
        body,
    }]);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

for (
    const scenario of [
        { name: "hiring", rows: 1, title: undefined },
        {
            name: "hiring-empty",
            rows: 0,
            title: "zz_monid_filter_probe_20261014_zz",
        },
    ]
) {
    Deno.test(`${ID} recorded ${scenario.name}: filters preserved, zero usage`, async () => {
        const unit = await testSealedUnit(ID);
        const fixture = await loadFixture(
            `${providerFixturesDir}${scenario.name}.json`,
        );
        const jobOpenings: Record<string, Json> = {
            hiring: true,
            department: ["engineering"],
            posted_date: "last30d",
        };
        if (scenario.title) {
            jobOpenings.job_title = { include: [scenario.title] };
        }
        const result = await runEndpoint({
            unit,
            input: { body: { job_openings: jobOpenings, limit: 1 } },
            mode: "replay",
            fixture,
        });
        const output = result.output as {
            data: Json[];
            meta: { results: number; filters: { job_openings: Json } };
        };

        assertEquals(result.httpStatus, 200);
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assertEquals(result.output, fixture.calls[0].res.body);
        assertEquals(output.data.length, scenario.rows);
        if (scenario.rows === 0) {
            assertEquals(output.meta.results, 0);
        } else {
            assertEquals(output.meta.results > 0, true);
        }
        assertEquals(output.meta.filters.job_openings, jobOpenings);
    });
}

Deno.test({
    name: `${ID} live (gated on HUNTERIO_API_KEY)`,
    ignore: liveSkip("hunterio"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: INPUT,
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output).slice(0, 500),
        );
        assertEquals(
            Object.prototype.toString.call(result.output) === "[object Object]",
            true,
        );
    },
});
