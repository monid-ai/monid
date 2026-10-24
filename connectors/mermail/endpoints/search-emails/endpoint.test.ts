import {
    assertHappyCall,
    assertRejectedBeforeCall,
} from "../../test-support.ts";

const ID = "mermail#search-emails";
const args = {
    mailboxId: "mb_public_1",
    query: {
        from: "billing@example.com",
        subject: "receipt",
        metadata_only: true,
    },
};

Deno.test(`${ID} happy: search hits stay inside the mailbox`, async () => {
    await assertHappyCall({
        id: ID,
        tool: "search_emails",
        rpcId: "mermail-search-emails",
        input: { body: args },
        args,
        credits: 1,
        output: {
            emails: [{
                id: "email_2",
                subject: "Your receipt",
                sender: "billing@example.com",
            }],
            totalCount: 1,
        },
    });
});

Deno.test(`${ID} schema rejects a web-search style extra field`, async () => {
    await assertRejectedBeforeCall(ID, {
        ...args,
        query: { ...args.query, domain: "example.com" },
    });
});
