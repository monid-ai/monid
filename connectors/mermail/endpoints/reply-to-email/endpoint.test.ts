import {
    assertHappyCall,
    assertRejectedBeforeCall,
} from "../../test-support.ts";

const ID = "mermail#reply-to-email";
const args = {
    mailboxId: "mb_public_1",
    emailId: "email_1",
    body: {
        to: "a@example.com",
        from: "agent@mermail.app",
        subject: "Re: Hi",
        text: "Thanks",
    },
};

Deno.test(`${ID} happy: accepted reply bills 5 credits`, async () => {
    await assertHappyCall({
        id: ID,
        tool: "reply_to_email",
        rpcId: "mermail-reply-to-email",
        input: { body: args },
        args,
        credits: 5,
        output: { id: "email_10", status: "sent" },
    });
});

Deno.test(`${ID} schema rejects a path-style email id outside the arguments`, async () => {
    await assertRejectedBeforeCall(ID, {
        mailboxId: args.mailboxId,
        body: args.body,
        messageId: "<rfc@example.com>",
    });
});
