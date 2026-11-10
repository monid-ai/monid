import {
    assertHappyCall,
    assertRejectedBeforeCall,
} from "../../test-support.ts";

const ID = "mermail#get-mailbox";
const args = { mailboxId: "mb_public_1" };

Deno.test(`${ID} happy: one mailbox, 1 credit, pinned get_mailbox call`, async () => {
    await assertHappyCall({
        id: ID,
        tool: "get_mailbox",
        rpcId: "mermail-get-mailbox",
        input: { body: args },
        args,
        credits: 1,
        output: {
            public_id: "mb_public_1",
            email: "agent@mermail.app",
            name: "Agent",
            can_receive: true,
            receiving_status: "ready",
        },
    });
});

Deno.test(`${ID} schema rejects a caller-selected tool name`, async () => {
    await assertRejectedBeforeCall(ID, { ...args, name: "delete_mailbox" });
});
