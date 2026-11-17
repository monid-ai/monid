import { assertEquals, assertRejects } from "@std/assert";
import { runEndpoint, testSealedUnit } from "@shared/testing";
import { estimateMailbox, INBOX_INPUT, MAILBOX } from "../../../test-data.ts";

const ID = "agentmail#release-inboxes/{id}";

Deno.test(`${ID}: requests release with no duplicate upstream teardown`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: INBOX_INPUT,
        mode: "replay",
        resources: [MAILBOX],
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.output, {
        inboxId: MAILBOX.externalId,
        status: "release_requested",
        note:
            "The inbox is being deleted immediately; all threads, messages and attachments are permanently lost. Track it via GET /v1/resources.",
    });
    assertEquals(result.resources, {
        releases: [{
            resource: "agentmail/mailbox",
            externalId: MAILBOX.externalId,
        }],
    });
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID}: foreign targets and malformed input cannot trigger release`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: INBOX_INPUT,
        mode: "replay",
        resources: [],
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.resources, undefined);
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
