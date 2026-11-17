import { assertEquals, assertRejects } from "@std/assert";
import { runEndpoint, testSealedUnit } from "@shared/testing";
import {
    captureEndpoint,
    estimateMailbox,
    fixture,
    MAILBOX,
} from "../../../test-data.ts";

const ID = "agentmail#update-inboxes/{id}";
const INPUT = {
    body: { inboxId: MAILBOX.externalId, displayName: "Updated Inbox" },
};

Deno.test(`${ID}: sends only display_name and emits the owned resource refresh`, async () => {
    const response = (await fixture("synthetic-mailbox-update")).calls[0].res;
    const { loaded, sent } = await captureEndpoint(ID, response);
    const result = await loaded.run(INPUT);
    assertEquals(sent[0].url, "https://api.agentmail.to/v0/inboxes/mbx-1");
    assertEquals(sent[0].method, "PATCH");
    assertEquals(sent[0].body, { display_name: "Updated Inbox" });
    assertEquals(result.httpStatus, 200);
    assertEquals(
        (result.output as { displayName: string }).displayName,
        "Updated Inbox",
    );
    assertEquals(result.resources, {
        refreshes: [{
            resource: "agentmail/mailbox",
            externalId: MAILBOX.externalId,
        }],
    });
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID}: ownership, required displayName and valid input twin`, async () => {
    const unit = await testSealedUnit(ID);
    const foreign = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        resources: [],
    });
    assertEquals(foreign.httpStatus, 404);
    assertEquals(foreign.usage, { credits: {}, evidence: {} });
    for (
        const body of [{ inboxId: MAILBOX.externalId }, {
            ...INPUT.body,
            displayName: "",
        }, { ...INPUT.body, status: "paused" }]
    ) {
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
        );
    }
    assertEquals(await estimateMailbox(ID, INPUT), {
        credits: {},
        evidence: {},
    });
});

Deno.test(`${ID}: a vendor failure never emits a successful refresh mark`, async () => {
    const f = await fixture("synthetic-mailbox-update");
    f.calls[0].res = { status: 503, body: { error: "unavailable" } };
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        resources: [MAILBOX],
        fixture: f,
    });
    assertEquals(result.httpStatus, 503);
    assertEquals(result.output, { error: "unavailable" });
    assertEquals(result.resources, undefined);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});
