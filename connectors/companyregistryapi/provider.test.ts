import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import {
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const FIXTURES = fromFileUrl(new URL("./fixtures/", import.meta.url));
const SEARCH = "companyregistryapi#v1/search";
const COMPANY = "companyregistryapi#v1/companies/{company_id}";
const NOKIA = "co_59hdg9w2ndfh5sv4stabqgxxak";

/** Keyless: live tests need only the network. `deno task test` grants
 *  none (skipped), `deno task test:live` does. */
const NO_NET =
    (await Deno.permissions.query({ name: "net" })).state !== "granted";

const FREE = { credits: {}, evidence: {} };

Deno.test("companyregistryapi: two FREE keyless GET docs, one shared auth fn, no hooks", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("companyregistryapi#")
    ).sort();
    assertEquals(ids, [COMPANY, SEARCH]);

    const search = bundle.endpoints[SEARCH];
    const company = bundle.endpoints[COMPANY];
    assertEquals(search.request.method, "GET");
    assertEquals(
        search.request.url,
        "https://api.companyregistryapi.com/v1/search",
    );
    assertEquals(company.request.method, "GET");
    assertEquals(
        company.request.url,
        "https://api.companyregistryapi.com/v1/companies/{company_id}",
    );

    // keyless: an empty credential shape, one identity inject fn shared
    assertEquals(search.auth.inject.$fn.key, company.auth.inject.$fn.key);
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.usage.model.kind, "FREE", id);
        assertEquals(doc.usage.consolidate, undefined, id);
        assertEquals(doc.input.toRequest, undefined, id);
        assertEquals(doc.output?.fromResponse, undefined, id);
        assert(
            doc.meta.categories?.includes("company-enrichment"),
            id,
        );
    }
});

const REPLAYS: {
    name: string;
    id: string;
    fixture: string;
    input: RunInput;
    status: number;
    check: (output: Record<string, unknown>) => void;
}[] = [
    {
        name: "search ok",
        id: SEARCH,
        fixture: "search-ok",
        input: {
            queryParams: { q: "nokia oyj", address_country: "FI", limit: 2 },
        },
        status: 200,
        check: (output) => {
            assertEquals((output.data as unknown[]).length, 2);
            assertEquals(output.address_countries, ["FI"]);
            assertEquals(typeof output.next_cursor, "string");
            assertEquals(output.attribution, "Powered by Coragrid");
        },
    },
    {
        name: "search empty",
        id: SEARCH,
        fixture: "search-empty",
        input: { queryParams: { q: "zzqxvw" } },
        status: 200,
        check: (output) => {
            assertEquals(output.data, []);
            assertEquals(output.next_cursor, null);
        },
    },
    {
        name: "search expired cursor",
        id: SEARCH,
        fixture: "search-expired-cursor",
        input: {
            queryParams: { q: "nokia oyj", limit: 2, cursor: "cur_expired" },
        },
        status: 400,
        check: (output) => {
            assertEquals(output.code, "invalid_request");
            assertEquals(output.retryable, false);
        },
    },
    {
        name: "search rate limited (synthetic)",
        id: SEARCH,
        fixture: "synthetic-rate-limited",
        input: { queryParams: { q: "nokia oyj" } },
        status: 429,
        check: (output) => {
            assertEquals(output.code, "rate_limited");
            assertEquals(output.retryable, true);
        },
    },
    {
        name: "company ok",
        id: COMPANY,
        fixture: "company-ok",
        input: { pathParams: { company_id: NOKIA } },
        status: 200,
        check: (output) => {
            const data = output.data as Record<string, unknown>;
            assertEquals(data.id, NOKIA);
            assertEquals(data.lifecycle, { status: "active" });
            const identifiers = data.identifiers as Record<string, unknown>[];
            assertEquals(identifiers[0].role, "root");
            assertEquals(output.attribution, "Powered by Coragrid");
        },
    },
    {
        name: "company not found",
        id: COMPANY,
        fixture: "company-not-found",
        input: { pathParams: { company_id: "co_00000000000000000000000009" } },
        status: 404,
        check: (output) => assertEquals(output.code, "not_found"),
    },
];

for (const replay of REPLAYS) {
    Deno.test(`companyregistryapi ${replay.name}: vendor body as output, zero usage`, async () => {
        const unit = await testSealedUnit(replay.id);
        const fixture = await loadFixture(
            `${FIXTURES}${replay.fixture}.json`,
        );
        const result = await runEndpoint({
            unit,
            input: replay.input,
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, replay.status);
        assertEquals(result.isProviderError, replay.status >= 400);
        assertEquals(result.usage, FREE);
        replay.check(result.output as Record<string, unknown>);
    });
}

Deno.test("companyregistryapi#v1/search: published bounds and patterns, unknown keys rejected", async () => {
    const unit = await testSealedUnit(SEARCH);
    const fixture = await loadFixture(`${FIXTURES}search-empty.json`);
    const rejected: Json[] = [
        {},
        { q: "zz" },
        { q: "z".repeat(65) },
        { q: "zzqxvw", limit: 0 },
        { q: "zzqxvw", limit: 26 },
        { q: "zzqxvw", address_country: "FIN" },
        { q: "zzqxvw", jurisdiction: "CA-QUEB" },
        { q: "zzqxvw", country: "FI" },
    ];
    for (const queryParams of rejected) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { queryParams } as RunInput,
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(queryParams),
        );
    }
    const ok = await runEndpoint({
        unit,
        input: { queryParams: { q: "zzqxvw" } },
        mode: "replay",
        fixture,
    });
    assertEquals(ok.isProviderError, false);
});

Deno.test("companyregistryapi#v1/companies/{company_id}: only a permanent co_ id", async () => {
    const unit = await testSealedUnit(COMPANY);
    const fixture = await loadFixture(`${FIXTURES}company-ok.json`);
    const rejected: Json[] = [
        {},
        { company_id: "Nokia Oyj" },
        { company_id: "0112038-9" },
        { company_id: NOKIA.toUpperCase() },
        { company_id: "co_89hdg9w2ndfh5sv4stabqgxxak" },
        { company_id: NOKIA, extra: "x" },
    ];
    for (const pathParams of rejected) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { pathParams } as RunInput,
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(pathParams),
        );
    }
});

Deno.test({
    name:
        "companyregistryapi live: search, then read the first result (keyless, needs --allow-net)",
    ignore: NO_NET,
    fn: async () => {
        const search = await runEndpoint({
            unit: await testSealedUnit(SEARCH),
            input: { queryParams: { q: "nokia oyj", address_country: "FI" } },
            mode: "live",
        });
        assertEquals(
            search.isProviderError,
            false,
            JSON.stringify(search.output),
        );
        assertEquals(search.usage, FREE);
        const data = (search.output as Record<string, unknown>)
            .data as Record<string, unknown>[];
        assert(data.length > 0, "search found a company");

        const company = await runEndpoint({
            unit: await testSealedUnit(COMPANY),
            input: { pathParams: { company_id: data[0].id as string } },
            mode: "live",
        });
        assertEquals(
            company.isProviderError,
            false,
            JSON.stringify(company.output),
        );
        assertEquals(company.usage, FREE);
        const profile = (company.output as Record<string, unknown>)
            .data as Record<string, unknown>;
        assertEquals(profile.id, data[0].id);
        assert(Array.isArray(profile.identifiers), "identifiers present");
    },
});
