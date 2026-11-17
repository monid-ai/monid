import {
    assertHappyCall,
    assertRejectedBeforeCall,
} from "../../test-support.ts";
import { estimateEndpoint, testSealedUnit } from "@shared/testing";
import { assertEquals } from "@std/assert";

const ID = "mermail#send-email";
const args = {
    mailboxId: "mb_public_1",
    body: {
        to: "a@example.com",
        from: "agent@mermail.app",
        subject: "Hi",
        text: "Hello",
    },
};

Deno.test(`${ID} happy: accepted send bills 5 credits`, async () => {
    await assertHappyCall({
        id: ID,
        tool: "send_email",
        rpcId: "mermail-send-email",
        input: { body: args },
        args,
        credits: 5,
        output: { id: "email_9", status: "sent" },
    });
});

Deno.test(`${ID} estimate is 5 before the call, and flat Sold fields are rejected`, async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(await estimateEndpoint(unit, { body: args }), {
        credits: { default: 5 },
        evidence: { CALL: 1 },
    });
    await assertRejectedBeforeCall(ID, {
        mailboxId: "mb_public_1",
        to: "a@example.com",
        from: "agent@mermail.app",
        subject: "Hi",
        text: "Hello",
    });
});
