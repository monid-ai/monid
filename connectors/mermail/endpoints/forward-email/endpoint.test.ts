import {
    assertHappyCall,
    assertRejectedBeforeCall,
} from "../../test-support.ts";

const ID = "mermail#forward-email";
const args = {
    mailboxId: "mb_public_1",
    emailId: "email_1",
    body: {
        to: "b@example.com",
        from: "agent@mermail.app",
        subject: "Fwd: Hi",
        text: "See below",
    },
};

Deno.test(`${ID} happy: accepted forward bills 5 credits`, async () => {
    await assertHappyCall({
        id: ID,
        tool: "forward_email",
        rpcId: "mermail-forward-email",
        input: { body: args },
        args,
        credits: 5,
        output: { id: "email_11", status: "sent" },
    });
});

Deno.test(`${ID} schema rejects an attachment path`, async () => {
    await assertRejectedBeforeCall(ID, {
        ...args,
        body: {
            ...args.body,
            attachments: [{ path: "/tmp/secret.pdf" }],
        },
    });
});
