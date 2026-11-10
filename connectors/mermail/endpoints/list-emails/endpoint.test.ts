import {
    assertHappyCall,
    assertRejectedBeforeCall,
} from "../../test-support.ts";

const ID = "mermail#list-emails";
const args = {
    mailboxId: "mb_public_1",
    query: {
        folder: "inbox",
        metadata_only: true,
        agent_safe_content: true,
        require_scan_status: "clean",
        limit: 10,
    },
};

Deno.test(`${ID} happy: folder page is unwrapped and billed as 1 credit`, async () => {
    await assertHappyCall({
        id: ID,
        tool: "list_emails",
        rpcId: "mermail-list-emails",
        input: { body: args },
        args,
        credits: 1,
        output: {
            emails: [{
                id: "email_1",
                subject: "Verify",
                scan_status: "clean",
            }],
            totalCount: 1,
        },
    });
});

Deno.test(`${ID} schema rejects an unknown query key before the call`, async () => {
    await assertRejectedBeforeCall(ID, {
        mailboxId: "mb_public_1",
        query: { folder: "inbox", tool: "delete_email" },
    });
});
