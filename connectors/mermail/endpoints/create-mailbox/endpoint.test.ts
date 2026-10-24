import {
    assertHappyCall,
    assertRejectedBeforeCall,
} from "../../test-support.ts";

const ID = "mermail#create-mailbox";
const args = {
    body: {
        email: "agent@mermail.app",
        name: "Agent",
    },
    idempotencyKey: "create-agent-mailbox",
};

Deno.test(`${ID} happy: 10 credits and the nested create_mailbox arguments`, async () => {
    await assertHappyCall({
        id: ID,
        tool: "create_mailbox",
        rpcId: "mermail-create-mailbox",
        input: { body: args },
        args,
        credits: 10,
        output: {
            public_id: "mb_public_1",
            email: "agent@mermail.app",
            name: "Agent",
        },
    });
});

Deno.test(`${ID} schema rejects a missing address and an unknown settings key`, async () => {
    await assertRejectedBeforeCall(ID, { body: { name: "Agent" } });
    await assertRejectedBeforeCall(ID, {
        body: {
            email: "agent@mermail.app",
            name: "Agent",
            settings: { fromName: "Agent" },
        },
    });
});
