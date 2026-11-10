import { assert, assertEquals } from "@std/assert";
import type { Json, RunInput, SealedUnit } from "@shared/core";
import { testBundle, testSealedUnit } from "@shared/testing";
import { applyAuth, directTransport, Engine } from "@monid/connector-engine";

/**
 * THE aimlapi provider suite — the attribution gate, which is the one
 * thing in this connector that is not ordinary connector plumbing.
 *
 * The claim under test, in three parts:
 *   1. a request that reaches `api.aimlapi.com` carries
 *      `X-AIMLAPI-Source`, `HTTP-Referer` and `X-Title` (and
 *      `X-AIMLAPI-Partner-ID` once an id exists);
 *   2. a request that reaches ANY other host carries none of them — a
 *      look-alike (`api.aimlapi.com.example.net`), a prefix twin
 *      (`notapi.aimlapi.com`), a userinfo trick
 *      (`https://api.aimlapi.com@evil.example`), a configured base-url
 *      override, and every OTHER connector in the catalog;
 *   3. the partner id is monid's registered one, it reaches the gateway
 *      and nowhere else, an EMPTY literal omits the header rather than
 *      sending it blank, and a malformed literal cannot ship.
 *
 * Part 2 is why the headers hang off `auth.inject` rather than
 * `request.headers`: static headers would egress to whatever host the
 * resolved url names. The gate therefore follows the DESTINATION, and the
 * tests below drive it from both ends — `applyAuth` (the engine's own
 * injector entry point, which is where the compiled fn actually runs) for
 * host variants, and a full `Engine.load().run()` through a capturing
 * fetch for the real wire.
 */

const CHAT = "aimlapi#chat/completions";
const GATEWAY = "https://api.aimlapi.com/v1/chat/completions";

/** monid's partner id, minted by AI/ML API on 2026-10-15. It is sent ONLY
 *  to the gateway host; every look-alike below must come back without it. */
const PARTNER_ID = "part_pMK3e60XT8WaIHr827sULMKZ";

const CHAT_BODY = {
    model: "openai/gpt-4o-mini",
    messages: [{ role: "user", content: "Say OK." }],
    max_tokens: 8,
};

/** The four attribution header names, lowercased for case-insensitive
 *  lookup through `Headers`. */
const SOURCE = "x-aimlapi-source";
const REFERER = "http-referer";
const TITLE = "x-title";
const PARTNER = "x-aimlapi-partner-id";
const ATTRIBUTION = [SOURCE, REFERER, TITLE, PARTNER];

/** What the compiled auth.inject produces for a request aimed at `url` —
 *  the engine's OWN injector path (`applyAuth` hash-verifies the entry,
 *  instantiates it and runs it through the auth slot contract), so this
 *  exercises the real fn and not a copy of its logic. */
const injectedHeaders = async (
    unit: SealedUnit,
    url: string,
): Promise<Record<string, string>> => {
    const doc = unit.doc;
    const request = await applyAuth({
        method: doc.request.method,
        url,
        headers: {},
        query: {},
        body: { probe: true },
        auth: {
            inject: {
                ref: doc.auth.inject,
                entry: unit.fns[doc.auth.inject.$fn.key],
            },
            credentials: doc.auth.credentials,
        },
        provider: doc.provider,
        timeouts: { requestMs: 1_000 },
    }, { apiKey: "test-key" });
    return request.headers;
};

/** One engine run against a stub that records what went on the wire
 *  (the dataforseo `wire` idiom). `url` overrides the compiled
 *  destination — the "someone configured a different base url" case. */
const wire = async (
    unit: SealedUnit,
    input: RunInput,
    response: Json,
    url?: string,
) => {
    const seen: { url: string; headers: Headers; body: unknown }[] = [];
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (target, init) => {
                seen.push({
                    url: target instanceof Request
                        ? target.url
                        : String(target),
                    headers: new Headers(init?.headers),
                    body: init?.body
                        ? JSON.parse(String(init.body))
                        : undefined,
                });
                return Promise.resolve(
                    new Response(JSON.stringify(response), {
                        status: 200,
                        headers: { "content-type": "application/json" },
                    }),
                );
            },
        }),
    });
    const retargeted: SealedUnit = url === undefined ? unit : {
        ...unit,
        doc: { ...unit.doc, request: { ...unit.doc.request, url } },
    };
    const loaded = await engine.load(retargeted);
    await loaded.run(input);
    assertEquals(seen.length, 1);
    return seen[0];
};

const CHAT_RESPONSE = {
    id: "chatcmpl-test",
    choices: [{ index: 0, message: { role: "assistant", content: "OK." } }],
    usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
    meta: { usage: { credits_used: 8, usd_spent: 0.000004 } },
};

Deno.test(`aimlapi wire: the request that reaches the gateway, headers and all`, async () => {
    const unit = await testSealedUnit(CHAT);
    const sent = await wire(unit, { body: CHAT_BODY }, CHAT_RESPONSE);

    // the destination, verbatim
    assertEquals(sent.url, GATEWAY);
    // the body the caller asked for, plus the binding's materialized `n`
    assertEquals(sent.body, { ...CHAT_BODY, n: 1 });
    // auth
    assertEquals(sent.headers.get("authorization"), "Bearer test-key");
    assertEquals(sent.headers.get("content-type"), "application/json");
    // attribution
    assertEquals(sent.headers.get(SOURCE), "agent/monid");
    assertEquals(
        sent.headers.get(REFERER),
        "https://github.com/monid-ai/monid",
    );
    assertEquals(sent.headers.get(TITLE), "Monid");
    // the partner id, on the wire, to the gateway host only
    assertEquals(sent.headers.get(PARTNER), PARTNER_ID);
});

Deno.test(`aimlapi attribution: present for the gateway host, on every endpoint`, async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("aimlapi#")).sort();
    assertEquals(ids, [
        "aimlapi#chat/completions",
        "aimlapi#images/generations",
        "aimlapi#key",
        "aimlapi#models",
    ]);
    for (const id of ids) {
        const unit = await testSealedUnit(id);
        // every aimlapi doc resolves to the ONE provider inject, so the
        // gate is a provider-wide fact rather than four copies
        assertEquals(
            unit.doc.auth.inject.$fn.key,
            (await testSealedUnit(CHAT)).doc.auth.inject.$fn.key,
            id,
        );
        const headers = await injectedHeaders(unit, unit.doc.request.url);
        assertEquals(headers["X-AIMLAPI-Source"], "agent/monid", id);
        assertEquals(
            headers["HTTP-Referer"],
            "https://github.com/monid-ai/monid",
            id,
        );
        assertEquals(headers["X-Title"], "Monid", id);
        assertEquals(headers["X-AIMLAPI-Partner-ID"], PARTNER_ID, id);
        assertEquals(headers.Authorization, "Bearer test-key", id);
    }
});

/**
 * THE look-alike table. Every row is a destination that is NOT the
 * gateway and must therefore come back bare, and each one would be
 * ATTRIBUTED by a sloppier test:
 *   - a suffix/`endsWith` test leaks to `api.aimlapi.com.example.net`
 *     and `api.aimlapi.com.` ;
 *   - a substring/`includes` test leaks to all of the first four;
 *   - a `startsWith` test on the url leaks to the userinfo rows, where
 *     the real destination is after the `@`;
 *   - forgetting the port/userinfo split leaks the authority forms.
 * The last rows are the plain "someone pointed the connector somewhere
 * else" cases.
 */
const LOOK_ALIKES = [
    "https://api.aimlapi.com.example.net/v1/chat/completions",
    "https://api.aimlapi.com.evil.test./v1/chat/completions",
    "https://notapi.aimlapi.com/v1/chat/completions",
    "https://api.aimlapi.com.attacker.example:443/v1/chat/completions",
    // userinfo: the host is evil.example, not api.aimlapi.com
    "https://api.aimlapi.com@evil.example/v1/chat/completions",
    "https://user:api.aimlapi.com@evil.example/v1/chat/completions",
    // the apex and a sibling subdomain are not the gateway either
    "https://aimlapi.com/v1/chat/completions",
    "https://staging.api.aimlapi.com/v1/chat/completions",
    // a trailing dot is a different hostname string; refuse rather than
    // guess
    "https://api.aimlapi.com./v1/chat/completions",
    // plain overrides
    "https://api.openai.com/v1/chat/completions",
    "http://localhost:8080/v1/chat/completions",
    "https://[::1]:8443/v1/chat/completions",
];

Deno.test(`aimlapi attribution: ABSENT for every look-alike host`, async () => {
    const unit = await testSealedUnit(CHAT);
    for (const url of LOOK_ALIKES) {
        const headers = await injectedHeaders(unit, url);
        // the request still gets its credential — it is a configured
        // destination, not an attack on auth — but no telemetry
        assertEquals(headers.Authorization, "Bearer test-key", url);
        for (const name of ATTRIBUTION) {
            const present = Object.keys(headers)
                .some((key) => key.toLowerCase() === name);
            assertEquals(present, false, `${name} leaked to ${url}`);
        }
    }
});

Deno.test(`aimlapi attribution: the gate follows the DESTINATION, so a base-url override moves it`, async () => {
    const unit = await testSealedUnit(CHAT);
    // same doc, same connector, same compiled inject — only the resolved
    // url differs, which is what a provider/endpoint `request.baseUrl`
    // override produces at compile time
    const elsewhere = await wire(
        unit,
        { body: CHAT_BODY },
        CHAT_RESPONSE,
        "https://api.aimlapi.com.example.net/v1/chat/completions",
    );
    assertEquals(
        elsewhere.url,
        "https://api.aimlapi.com.example.net/v1/chat/completions",
    );
    assertEquals(elsewhere.headers.get("authorization"), "Bearer test-key");
    for (const name of ATTRIBUTION) {
        assertEquals(elsewhere.headers.has(name), false, name);
    }

    // and the control: the SAME run against the compiled destination is
    // attributed, so the difference is the host and nothing else
    const gateway = await wire(unit, { body: CHAT_BODY }, CHAT_RESPONSE);
    assertEquals(gateway.headers.get(SOURCE), "agent/monid");
});

Deno.test(`aimlapi attribution: ABSENT from every other connector's wire`, async () => {
    const bundle = await testBundle();
    // a real, unrelated connector run: nothing aimlapi-shaped may appear
    // on it (the headers are not a compiler-level static default)
    const other = "exa#search";
    assert(
        bundle.endpoints[other] !== undefined,
        `expected ${other} in the bundle`,
    );
    const sent = await wire(
        await testSealedUnit(other),
        { body: { query: "monid" } },
        { results: [] },
    );
    for (const name of ATTRIBUTION) {
        assertEquals(sent.headers.has(name), false, `${name} on ${other}`);
    }

    // and no OTHER provider in the catalog shares aimlapi's inject fn —
    // identical sources intern to one entry, so this would catch a copy
    // of the gate pasted into another connector
    const ours = (await testSealedUnit(CHAT)).doc.auth.inject.$fn.key;
    for (const [id, doc] of Object.entries(bundle.endpoints)) {
        if (id.startsWith("aimlapi#")) continue;
        assert(
            doc.auth.inject.$fn.key !== ours,
            `${id} shares aimlapi's auth.inject`,
        );
    }
});

Deno.test(`aimlapi attribution: the registered partner id, held to its format`, async () => {
    const unit = await testSealedUnit(CHAT);
    const entry = unit.fns[unit.doc.auth.inject.$fn.key];
    assertEquals(
        entry.provenance,
        "connectors/aimlapi/provider.ts#auth.inject",
    );

    // the literal in the compiled fn IS the partner id — there is no
    // second copy to drift, because a closed term cannot import one
    const match = /const partnerId\s*=\s*"([^"]*)"/.exec(entry.src);
    assert(match !== null, "no partnerId literal in the compiled inject fn");
    const partnerId = match[1];

    // monid's registered id, and nothing but a well-formed partner id can
    // ever sit here — an empty literal (the pre-registration state) stays
    // legal because it omits the header entirely
    assertEquals(partnerId, PARTNER_ID);
    assert(
        partnerId === "" || /^part_[A-Za-z0-9]{1,64}$/.test(partnerId),
        `partnerId ${JSON.stringify(partnerId)} is neither empty nor ` +
            `^part_[A-Za-z0-9]{1,64}$`,
    );

    // it is sent for the gateway, with that exact value
    const headers = await injectedHeaders(unit, GATEWAY);
    assertEquals(headers["X-AIMLAPI-Partner-ID"], PARTNER_ID);

    // the OTHER half of the claim: the id lives in ONE literal and the
    // gate does not depend on its value. Run the compiled source with the
    // literal EMPTIED — same fn, one literal changed — and the header is
    // omitted rather than sent blank, while the rest of the attribution
    // still rides.
    const emptied = entry.src.replace(
        /const partnerId\s*=\s*"[^"]*"/,
        'const partnerId = ""',
    );
    assert(emptied !== entry.src, "the substitution did not apply");
    const withId = new Function(`"use strict"; return (${emptied});`)() as (
        ctx: {
            data: {
                request: Record<string, Json>;
                params: Record<string, string>;
            };
        },
    ) => { headers: Record<string, string> };
    const atGateway = withId({
        data: {
            request: { url: GATEWAY, headers: {}, query: {} },
            params: { apiKey: "test-key" },
        },
    });
    assertEquals("X-AIMLAPI-Partner-ID" in atGateway.headers, false);
    assertEquals(atGateway.headers["X-AIMLAPI-Source"], "agent/monid");
    const atLookAlike = withId({
        data: {
            request: {
                url: "https://api.aimlapi.com.example.net/v1/chat/completions",
                headers: {},
                query: {},
            },
            params: { apiKey: "test-key" },
        },
    });
    assertEquals("X-AIMLAPI-Partner-ID" in atLookAlike.headers, false);
});

Deno.test(`aimlapi provider: the vendor meter is the claim, and pluck is exact`, async () => {
    const unit = await testSealedUnit(CHAT);
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: () =>
                Promise.resolve(
                    new Response(JSON.stringify(CHAT_RESPONSE), {
                        status: 200,
                        headers: { "content-type": "application/json" },
                    }),
                ),
        }),
    });
    const result = await (await engine.load(unit)).run({ body: CHAT_BODY });
    // 8 credits x $0.0000005 = $0.000004 — the claim and the derived fold
    // agree, so no usage.mismatch rides out
    assertEquals(result.usage, {
        credits: { default: 0.000004 },
        evidence: { CREDIT: 8 },
    });
    const output = result.output as Record<string, unknown>;
    // the vendor's meta.usage node is gone...
    const meta = output.meta as Record<string, unknown>;
    assertEquals("usage" in meta, false);
    // ...but the caller's top-level token usage SURVIVED (pluck is exact,
    // a deep omit of "usage" would have taken both)
    assertEquals(output.usage, {
        prompt_tokens: 10,
        completion_tokens: 2,
        total_tokens: 12,
    });
});
