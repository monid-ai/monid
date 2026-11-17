import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { directTransport, Engine, EngineError } from "@monid/connector-engine";
import type { Json } from "@shared/core";
import {
    loadFixture,
    replayFetch,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const chain = (name: string) => loadFixture(`${FIXTURES}${name}.json`);
const ID = "reversecontact#v2/contact/email";
const asRecord = (value: Json | undefined) =>
    value as Record<string, Json | undefined>;

const URL_BODY = { url: "https://www.linkedin.com/in/janedoe" };

const run = async (fixture: string, body: Record<string, Json> = URL_BODY) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await chain(fixture),
    });

/** Replays a chain through a network that drops the calls numbered in
 *  `dropped` (0-based) before they reach the chain, as a connection reset
 *  would. Returns the run and every call the engine sent. */
const runOverFlakyNetwork = async (fixture: string, dropped: number[]) => {
    const unit = await testSealedUnit(ID);
    const requestUrl = unit.doc.request.url;
    const replay = replayFetch(await chain(fixture), {
        "request.url": requestUrl,
        "request.origin": new URL(requestUrl).origin,
    });
    const sent: string[] = [];
    const loaded = await new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (input, init) => {
                sent.push(init?.method ?? "GET");
                return dropped.includes(sent.length - 1)
                    ? Promise.reject(new TypeError("connection reset"))
                    : replay(input, init);
            },
        }),
        sleep: () => Promise.resolve(),
    }).load(unit);
    return { result: await loaded.run({ body: URL_BODY }), sent };
};

const WEBHOOK_ID = "6f1c2a9e-3b7d-4c55-9a8e-1d2f3a4b5c6d";
const json = (
    status: number,
    body: Json,
    headers: Record<string, string> = {},
) => new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
});

/** The endpoint over a hand-written upstream, its start driven the way a
 *  host drives it: under the run handle it is given, as often as it is
 *  retried. */
const loadOver = async (fetch: typeof globalThis.fetch) =>
    await new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch,
        }),
        sleep: () => Promise.resolve(),
    }).load(await testSealedUnit(ID));

Deno.test(`${ID} found: the run waits for the job and settles on the job's own receipt, not the poll's quotas`, async () => {
    const result = await run("synthetic-contact-email-found");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // the acknowledgement's receipt (3) and the poll's quotas (0) both
    // leave; `data.creditsConsumed` (3, net of refunds) is the bill
    assertEquals(result.usage, {
        credits: { default: 3 },
        evidence: { CREDIT: 3 },
    });
    const output = asRecord(result.output);
    assertEquals("quotas" in output, false);
    const data = asRecord(output.data);
    assertEquals("creditsConsumed" in data, false);
    assertEquals(data.status, "succeeded");
    assertEquals(data.result, [{
        value: "jane.doe@example.com",
        type: "professional",
    }]);
});

Deno.test(`${ID} not found: a refunded job is a 404 with its code and a readable message, zero usage`, async () => {
    const result = await run("synthetic-contact-email-not-found");
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = asRecord(result.output);
    assertEquals(output.code, "email-not-found");
    assertEquals(
        output.message,
        "No email address of the requested kind was found for this person. Nothing was billed.",
    );
    assertEquals("quotas" in asRecord(output.raw), false);
});

Deno.test(`${ID} any, both kinds found: the receipt's 8 settles the run, the extra 3 upstream debited on the result included`, async () => {
    const result = await run("synthetic-contact-email-any-both", {
        ...URL_BODY,
        emailType: "any",
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 8 },
        evidence: { CREDIT: 8 },
    });
    const data = asRecord(asRecord(result.output).data);
    assertEquals(
        (data.result as Array<Record<string, Json>>).map((email) => email.type),
        ["professional", "personal"],
    );
});

Deno.test(`${ID} any, professional only: settles at 3, not at the 5 debited upfront`, async () => {
    const result = await run("synthetic-contact-email-any-professional", {
        ...URL_BODY,
        emailType: "any",
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 3 },
        evidence: { CREDIT: 3 },
    });
});

Deno.test(`${ID} upstream failure: fetch-data-error is a retriable 502, zero usage`, async () => {
    const result = await run("synthetic-contact-fetch-error");
    assertEquals(result.httpStatus, 502);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(asRecord(result.output).code, "fetch-data-error");
});

Deno.test(`${ID} a 503 on the poll holds the run open; the next read settles it`, async () => {
    const result = await run("synthetic-contact-poll-transient");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 3 },
        evidence: { CREDIT: 3 },
    });
});

Deno.test(`${ID} a finished job without its receipt fails closed (FN_CONTRACT), never a zero bill`, async () => {
    // the phone finder's evidence is the same interned fn (provider.test.ts)
    await assertRejects(
        () => run("synthetic-contact-receipt-missing"),
        Error,
        "FN_CONTRACT",
    );
});

Deno.test(`${ID} refused at submit (402): settles at once, zero usage, no poll`, async () => {
    const result = await run("synthetic-insufficient-credits");
    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(asRecord(result.output).code, "INSUFFICIENT_CREDITS");
});

Deno.test(`${ID} a 401 then a 403 on the poll hold the run open: the job runs on upstream, the third read settles it`, async () => {
    const result = await run("synthetic-contact-poll-auth-transient");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 3 },
        evidence: { CREDIT: 3 },
    });
});

Deno.test(`${ID} a 404 on the poll (the job cannot be read) fails the run as a 502, never a free miss`, async () => {
    const result = await run("synthetic-contact-poll-gone");
    assertEquals(result.httpStatus, 502);
    assertEquals(result.providerHttpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = asRecord(result.output);
    assertEquals(output.code, "WEBHOOK_EVENT_NOT_FOUND");
    assertEquals(
        output.message,
        "Webhook event not found: 6f1c2a9e-3b7d-4c55-9a8e-1d2f3a4b5c6d",
    );
    assertEquals("quotas" in asRecord(output.raw), false);
});

Deno.test(`${ID} a 410 on the poll (the job is past retention) fails the run as a 502 too`, async () => {
    const result = await run("synthetic-contact-poll-expired");
    assertEquals(result.httpStatus, 502);
    assertEquals(result.providerHttpStatus, 410);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(asRecord(result.output).code, "WEBHOOK_EVENT_EXPIRED");
});

Deno.test(`${ID} a poll lost in transit holds the run open: the next read goes on`, async () => {
    const { result, sent } = await runOverFlakyNetwork(
        "synthetic-contact-email-found",
        [1],
    );
    assertEquals(sent, ["POST", "GET", "GET", "GET"]);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 3 },
        evidence: { CREDIT: 3 },
    });
});

Deno.test(`${ID} a submit lost in transit fails the start as retriable; the host's resend carries the same Idempotency-Key and gets the first job back`, async () => {
    // Upstream as the gateway answers it: the first submit starts the job
    // and its response is lost; the resend under the same key replays the
    // acknowledgement.
    const sent: Headers[] = [];
    const loaded = await loadOver((_input, init) => {
        sent.push(new Headers(init?.headers));
        return sent.length === 1
            ? Promise.reject(new TypeError("connection reset"))
            : Promise.resolve(json(200, {
                success: true,
                data: { status: "created", webhookId: WEBHOOK_ID },
                error: null,
            }, { "idempotent-replayed": "true" }));
    });
    const handle = { runId: "run-42" };
    const lost = await assertRejects(
        () => loaded.start({ body: URL_BODY }, handle),
        EngineError,
    );
    assertEquals(lost.code, "EXECUTION_FAILED");
    assertEquals(lost.retriable, true);
    const resent = await loaded.start({ body: URL_BODY }, handle);
    assertEquals(
        resent.kind === "RUNNING" && resent.state.externalRunId,
        WEBHOOK_ID,
    );
    // another run, another key; the bearer the provider compiles stays
    await loaded.start({ body: URL_BODY }, { runId: "run-43" });
    assertEquals(sent.map((headers) => headers.get("idempotency-key")), [
        "run-42:submit",
        "run-42:submit",
        "run-43:submit",
    ]);
    assertEquals(sent[0].get("authorization"), "Bearer test-key");
});

Deno.test(`${ID} a resend while the first submit is still processed (409 IDEMPOTENCY_KEY_IN_USE) fails the start as retriable, never a settled run`, async () => {
    const loaded = await loadOver(() =>
        Promise.resolve(json(409, {
            success: false,
            data: null,
            error: {
                code: "IDEMPOTENCY_KEY_IN_USE",
                message: "A request with this Idempotency-Key is still being " +
                    "processed. Retry shortly to receive its response.",
                details: { retryAfter: 1 },
            },
        }, { "retry-after": "1" }))
    );
    const inUse = await assertRejects(
        () => loaded.start({ body: URL_BODY }, { runId: "run-42" }),
        EngineError,
    );
    assertEquals(inUse.code, "EXECUTION_FAILED");
    assertEquals(inUse.retriable, true);
});

Deno.test(`${ID} budget: 30 minutes, room past the slowest production job (321 s) for a poll outage, read every 2 s as upstream's Retry-After asks`, async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(unit.doc.timeouts, {
        requestMs: 35_000,
        runMs: 1_800_000,
        pollMs: 2_000,
    });
});
