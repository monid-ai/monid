import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const SCRAPE = "zenrows#scrape";
const EXTRACT = "zenrows#extract";
const METER = "x-request-credits";
const MARKDOWN = fromFileUrl(
    new URL("./fixtures/scrape-markdown.json", import.meta.url),
);
const INPUT = { queryParams: { url: "https://example.com/" } };

/** One scrape run against the metered chain with the meter replaced in
 *  memory. Mutating after `loadFixture` is deliberate: the recorder's
 *  header allowlist is a refinement inside `loadFixture`, so the matrix
 *  can cover values no fixture may carry on disk. */
async function runWithMeter(headers: Record<string, string>) {
    const unit = await testSealedUnit(SCRAPE);
    const fixture = await loadFixture(MARKDOWN);
    fixture.calls[0].res.headers = headers;
    return await runEndpoint({ unit, input: INPUT, mode: "replay", fixture });
}

Deno.test("zenrows billing: the X-Request-Credits claim settles the bill", async () => {
    const result = await runWithMeter({ [METER]: "5" });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 5 },
        evidence: { CREDIT: 5 },
    });
});

Deno.test("zenrows billing: a missing meter falls back to the 25-credit hold", async () => {
    const result = await runWithMeter({});
    assertEquals(result.usage, {
        credits: { default: 25 },
        evidence: { CREDIT: 25 },
    });
});

Deno.test("zenrows billing: a malformed meter can never become a free run", async () => {
    // Anything the guard refuses settles at the ceiling, never at zero: a
    // stripped or garbled header must not hand out a free request.
    for (
        const value of [
            "",
            " ",
            "abc",
            "-1",
            "1.5",
            "1e3",
            "0x5",
            "5 credits",
            // one past Number.MAX_SAFE_INTEGER: digits, but not a safe integer
            "9007199254740992",
        ]
    ) {
        const result = await runWithMeter({ [METER]: value });
        assertEquals(
            result.usage,
            { credits: { default: 25 }, evidence: { CREDIT: 25 } },
            `a meter of ${JSON.stringify(value)} must settle at the ceiling`,
        );
    }
});

Deno.test("zenrows billing: an explicit zero is a free run, and says so in evidence", async () => {
    // Zenrows charges nothing for some answers. A parsed 0 is a claim like
    // any other and must not be confused with the header being absent.
    const result = await runWithMeter({ [METER]: "0" });
    // The engine carries a zero draw in the evidence and leaves the pool
    // entry off: nothing was spent, so there is nothing to settle. That is
    // distinct from a missing meter, which settles at the 25 ceiling above.
    assertEquals(result.usage, { credits: {}, evidence: { CREDIT: 0 } });
});

Deno.test("zenrows billing: a readable meter never rides out as a mismatch", async () => {
    // The rate is an identity, so the engine's derived fold equals the
    // vendor's claim at every value and no usage.mismatch can appear.
    for (const value of ["1", "5", "10", "25", "137"]) {
        const result = await runWithMeter({ [METER]: value });
        assertEquals(result.usage, {
            credits: { default: Number(value) },
            evidence: { CREDIT: Number(value) },
        });
    }
});

Deno.test("zenrows: both endpoints share the relay, the claim, the evidence and the hold", async () => {
    const bundle = await testBundle();
    const scrape = bundle.endpoints[SCRAPE];
    const extract = bundle.endpoints[EXTRACT];
    assertEquals(
        typeof scrape.lifecycle?.start?.$fn.key,
        "string",
        "the relay is on the compiled doc",
    );
    assertEquals(
        extract.lifecycle?.start?.$fn.key,
        scrape.lifecycle?.start?.$fn.key,
    );
    assertEquals(
        extract.usage.consolidate?.$fn.key,
        scrape.usage.consolidate?.$fn.key,
    );
    assertEquals(extract.usage.evidence.$fn.key, scrape.usage.evidence.$fn.key);
    assertEquals(extract.usage.estimate.$fn.key, scrape.usage.estimate.$fn.key);
    assertEquals(extract.lifecycle?.poll, undefined);
    assertEquals(scrape.lifecycle?.poll, undefined);
});

/** The published rate card, every row confirmed against a live request to
 *  api.zenrows.com. `mode=auto` is the one row that is a ceiling rather
 *  than a price: Adaptive Stealth Mode settles anywhere from 1 to 25, and
 *  a hold has to cover the top of that range. */
const RATES: [Record<string, unknown>, number][] = [
    [{}, 1],
    [{ js_render: true }, 5],
    [{ premium_proxy: true }, 10],
    [{ premium_proxy: true, proxy_country: "us" }, 10],
    [{ js_render: true, premium_proxy: true }, 25],
    [{ mode: "auto" }, 25],
    [{ mode: "auto", proxy_country: "us" }, 25],
];

Deno.test("zenrows estimates: the hold is the caller's own configuration", async () => {
    const unit = await testSealedUnit(SCRAPE);
    for (const [extra, credits] of RATES) {
        assertEquals(
            (await estimateEndpoint(unit, {
                queryParams: { ...INPUT.queryParams, ...extra },
            })).credits,
            { default: credits },
            `${JSON.stringify(extra)} should hold ${credits}`,
        );
    }
});

Deno.test("zenrows estimates: both endpoints price a configuration alike", async () => {
    const scrape = await testSealedUnit(SCRAPE);
    const extract = await testSealedUnit(EXTRACT);
    const queryParams = {
        url: "https://www.scrapingcourse.com/ecommerce/product/abominable-hoodie/",
        js_render: true,
    };
    assertEquals(
        (await estimateEndpoint(extract, { queryParams })).credits,
        (await estimateEndpoint(scrape, { queryParams })).credits,
    );
    assertEquals(
        (await estimateEndpoint(extract, { queryParams })).credits,
        { default: 5 },
    );
});
