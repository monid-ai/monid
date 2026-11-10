import {
    assertHappyCall,
    assertRejectedBeforeCall,
} from "../../test-support.ts";

const ID = "mermail#get-email";
const args = {
    mailboxId: "mb_public_1",
    emailId: "email_1",
    query: { require_scan_status: "clean", max_body_chars: 4000 },
};

Deno.test(`${ID} happy: one message, 1 credit`, async () => {
    await assertHappyCall({
        id: ID,
        tool: "get_email",
        rpcId: "mermail-get-email",
        input: { body: args },
        args,
        credits: 1,
        output: {
            id: "email_1",
            subject: "Verify",
            scan_status: "clean",
            text: "Code 123456",
        },
    });
});

Deno.test(`${ID} schema rejects a caller-supplied MCP method`, async () => {
    await assertRejectedBeforeCall(ID, { ...args, method: "tools/list" });
});
