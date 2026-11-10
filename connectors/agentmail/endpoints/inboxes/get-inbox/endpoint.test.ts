import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { liveSkip, runEndpoint, testSealedUnit } from "@shared/testing";
import {
    captureEndpoint,
    estimateMailbox,
    fixture,
    INBOX_INPUT,
    MAILBOX,
} from "../../../test-data.ts";

const ID = "agentmail#inboxes/{id}";

Deno.test(`${ID}: public address resolves to the distinct native ID, without a GET body`, async () => {
    const response = (await fixture("synthetic-mailbox-read")).calls[0].res;
    const { loaded, sent } = await captureEndpoint(ID, response);
    const result = await loaded.run(INBOX_INPUT);
    assertEquals(sent[0].url, "https://api.agentmail.to/v0/inboxes/mbx-1");
    assertEquals(sent[0].method, "GET");
    assertEquals(sent[0].body, undefined);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.output, {
        inboxId: MAILBOX.externalId,
        email: MAILBOX.externalId,
        displayName: "Synthetic Inbox",
        createdAt: "2026-10-27T00:00:00Z",
        updatedAt: "2026-10-27T00:00:00Z",
    });
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.resources, undefined);
});

Deno.test(`${ID}: unknown addresses cannot reach the provider`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body: { inboxId: "foreign@example.test" } },
        mode: "replay",
        resources: [MAILBOX],
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    await assertRejects(
        () => runEndpoint({ unit, input: { body: {} }, mode: "replay" }),
        Error,
        "INVALID_INPUT",
    );
    assertEquals(await estimateMailbox(ID, INBOX_INPUT), {
        credits: {},
        evidence: {},
    });
});

Deno.test(`${ID}: a native ID is encoded as one URL segment`, async () => {
    const nativeId = "mbx/one?x=1";
    const { loaded, sent } = await captureEndpoint(ID, {
        status: 200,
        body: { inbox_id: nativeId, email: MAILBOX.externalId },
    }, [{
        ...MAILBOX,
        data: { email: MAILBOX.externalId, upstreamInboxId: nativeId },
    }]);
    const result = await loaded.run(INBOX_INPUT);
    assertEquals(result.httpStatus, 200);
    assertEquals(
        sent[0].url,
        "https://api.agentmail.to/v0/inboxes/mbx%2Fone%3Fx%3D1",
    );
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID}: malformed/mismatched success is an explicit zero-usage 502`, async () => {
    for (
        const body of [{ inbox_id: "another", email: MAILBOX.externalId }, {
            inbox_id: "mbx-1",
        }, { inbox_id: 42, email: MAILBOX.externalId }] as Json[]
    ) {
        const f = await fixture("synthetic-mailbox-read");
        f.calls[0].res.body = body;
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: INBOX_INPUT,
            mode: "replay",
            resources: [MAILBOX],
            fixture: f,
        });
        assertEquals(result.httpStatus, 502);
        assertEquals(result.providerHttpStatus, 200);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    }
});

Deno.test({
    name:
        `${ID}: optional read-only vendor smoke test using an existing test mailbox`,
    ignore: liveSkip("agentmail") || !Deno.env.get("AGENTMAIL_TEST_INBOX") ||
        !Deno.env.get("AGENTMAIL_TEST_UPSTREAM_INBOX_ID"),
    fn: async () => {
        const email = Deno.env.get("AGENTMAIL_TEST_INBOX")!;
        const nativeId = Deno.env.get("AGENTMAIL_TEST_UPSTREAM_INBOX_ID")!;
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { body: { inboxId: email } },
            mode: "live",
            resources: [{
                resource: "agentmail/mailbox",
                externalId: email,
                data: { email, upstreamInboxId: nativeId },
            }],
        });
        assertEquals(result.httpStatus, 200);
        assert(!result.isProviderError);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
