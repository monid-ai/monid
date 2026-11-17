import { assertEquals } from "@std/assert";
import { runEndpoint, testSealedUnit } from "@shared/testing";
import { MAILBOX } from "../../../test-data.ts";

const ID = "agentmail#list-inboxes";

Deno.test(`${ID}: projects only owned mailbox data, with zero upstream calls`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {},
        mode: "replay",
        resources: [MAILBOX],
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.output, [{
        inboxId: MAILBOX.externalId,
        email: MAILBOX.externalId,
        displayName: "Synthetic Inbox",
        syncedAt: MAILBOX.syncedAt!,
    }]);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.resources, undefined);
});

Deno.test(`${ID}: an empty ownership window stays empty`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {},
        mode: "replay",
        resources: [],
    });
    assertEquals(result.output, []);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});
