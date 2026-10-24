import {
    assertHappyCall,
    assertRejectedBeforeCall,
} from "../../test-support.ts";

const ID = "mermail#get-email-context";
const args = {
    mailboxId: "mb_public_1",
    emailId: "email_1",
    query: { limit: 5 },
};

Deno.test(`${ID} happy: selected message plus a thread page`, async () => {
    await assertHappyCall({
        id: ID,
        tool: "get_email_context",
        rpcId: "mermail-get-email-context",
        input: { body: args },
        args,
        credits: 1,
        output: {
            email: { id: "email_1", text: "Code 123456" },
            messages: [{ id: "email_1", text: "Code 123456" }],
            next_cursor: "page-2",
        },
    });
});

Deno.test(`${ID} schema rejects a limit above the tool maximum`, async () => {
    await assertRejectedBeforeCall(ID, {
        ...args,
        query: { limit: 51 },
    });
});
