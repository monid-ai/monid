import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { runEndpoint, testSealedUnit } from "@shared/testing";
import {
    captureEndpoint,
    estimateMailbox,
    fixture,
    MAILBOX,
} from "../../../test-data.ts";

const ID = "agentmail#create-inboxes";

Deno.test(`${ID}: native mapping, stable client_id and period-one provision`, async () => {
    const response = (await fixture("synthetic-mailbox-create")).calls[0].res;
    const { loaded, sent } = await captureEndpoint(ID, response, []);
    const input = {
        body: {
            username: "synthetic-inbox",
            domain: "agentmail.to",
            displayName: "Synthetic Inbox",
        },
    };
    const first = await loaded.start(input, { runId: "run@one" });
    const retry = await loaded.start(input, { runId: "run@one" });
    const another = await loaded.start(input, { runId: "run-two" });
    assert(
        first.kind === "COMPLETED" && retry.kind === "COMPLETED" &&
            another.kind === "COMPLETED",
    );
    assertEquals(first.usage, {
        credits: { default: 1 },
        evidence: { CALL: 1 },
    });
    assertEquals(await loaded.estimate(input), first.usage);
    assertEquals(sent[0].url, "https://api.agentmail.to/v0/inboxes");
    assertEquals(sent[0].method, "POST");
    assertEquals(sent[0].headers.get("authorization"), "Bearer test-key");
    assertEquals(sent[0].body, {
        username: "synthetic-inbox",
        domain: "agentmail.to",
        display_name: "Synthetic Inbox",
        client_id: "monid-inbox-run_40one",
    });
    assertEquals(sent[1].body, sent[0].body);
    assert(
        (sent[2].body as { client_id: string }).client_id !==
            (sent[0].body as { client_id: string }).client_id,
    );
    const seed = first.resources?.provisions?.[0];
    assertEquals(first.resources?.provisions?.length, 1);
    assertEquals(seed?.resource, "agentmail/mailbox");
    assertEquals(seed?.externalId, MAILBOX.externalId);
    assertEquals(seed?.identifier, MAILBOX.externalId);
    assertEquals(seed?.data, {
        ...MAILBOX.data as Record<string, unknown>,
        updatedAt: "2026-10-27T00:00:00Z",
    });
    assertEquals(first.output, {
        inboxId: MAILBOX.externalId,
        email: MAILBOX.externalId,
        displayName: "Synthetic Inbox",
        createdAt: "2026-10-27T00:00:00Z",
        updatedAt: "2026-10-27T00:00:00Z",
    });
    assertEquals(retry.resources?.provisions, first.resources?.provisions);
});

Deno.test(`${ID}: optional knobs remain optional and internal knobs are refused`, async () => {
    const unit = await testSealedUnit(ID);
    const response = (await fixture("synthetic-mailbox-create")).calls[0].res;
    const { loaded, sent } = await captureEndpoint(ID, response, []);
    const result = await loaded.start({ body: {} }, { runId: "empty" });
    assert(result.kind === "COMPLETED");
    assertEquals(sent[0].body, { client_id: "monid-inbox-empty" });
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CALL: 1 },
    });
    for (
        const body of [
            { username: "" },
            { displayName: "" },
            { username: "x".repeat(65) },
            { client_id: "caller-controlled" },
            { status: "paused" },
        ] as Json[]
    ) {
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
        );
    }
    assertEquals(
        await estimateMailbox(ID, { body: { username: "valid" } }),
        result.usage,
    );
});

Deno.test(`${ID}: client_id stays vendor-safe, collision-free and bounded before IO`, async () => {
    const response = (await fixture("synthetic-mailbox-create")).calls[0].res;
    const { loaded, sent } = await captureEndpoint(ID, response, []);
    const runIds = [
        "run@one",
        "run_40one",
        "run%40one",
        "run!'()*",
        "run-\u00e9",
        "11111111-2222-4333-8444-555555555555",
    ];
    for (const runId of runIds) {
        await loaded.start({ body: {} }, { runId });
    }
    const clientIds = sent.map((s) =>
        (s.body as { client_id: string }).client_id
    );
    assertEquals(new Set(clientIds).size, runIds.length);
    assert(clientIds.every((id) => /^[A-Za-z0-9._~-]{1,256}$/.test(id)));
    assertEquals(clientIds.at(-1), "monid-inbox-" + runIds.at(-1));
    await assertRejects(
        () => loaded.start({ body: {} }, { runId: "x".repeat(245) }),
        Error,
        "client_id",
    );
    assertEquals(sent.length, runIds.length);
});

Deno.test(`${ID}: custom domains fail before IO instead of bypassing domain ownership`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { domain: "example.test" } },
        mode: "replay",
    });
    assertEquals(result.httpStatus, 501);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.resources, undefined);
});

Deno.test(`${ID}: upstream failures create no resource and bill zero`, async () => {
    const f = await fixture("synthetic-mailbox-create");
    f.calls[0].res = { status: 409, body: { error: "already_exists" } };
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: {} },
        mode: "replay",
        fixture: f,
    });
    assertEquals(result.httpStatus, 409);
    assertEquals(result.output, { error: "already_exists" });
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.resources, undefined);
});

Deno.test(`${ID}: an unreadable successful creation parks provision recovery`, async () => {
    const unit = await testSealedUnit(ID);
    for (
        const body of [
            { inbox_id: "mbx-1" },
            { email: MAILBOX.externalId },
            {
                inbox_id: "",
                email: MAILBOX.externalId,
            },
            { inbox_id: "..", email: MAILBOX.externalId },
            { inbox_id: 42, email: MAILBOX.externalId },
            { inbox_id: "mbx-1", email: 42 },
        ] as Json[]
    ) {
        const f = await fixture("synthetic-mailbox-create");
        f.calls[0].res.body = body;
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { body: {} },
                    mode: "replay",
                    fixture: f,
                }),
            Error,
            "PROVISION_CONSTRUCT",
        );
    }
});
