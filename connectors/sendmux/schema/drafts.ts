import { z } from "zod";

export const zMailboxSelection = z.strictObject({
    mailbox_id: z.string().min(1).describe(
        "ID of an inbox owned by this workspace.",
    ),
});

const address = z.strictObject({
    email: z.email().max(254),
    name: z.string().max(255).nullable().optional(),
});

const attachment = z.strictObject({
    blob_id: z.string().min(1).max(255),
    filename: z.string().min(1).max(255),
    content_type: z.string().min(1).max(255),
    size_bytes: z.number().int().nonnegative().max(7_500_000),
    disposition: z.enum(["attachment", "inline"]).optional(),
    content_id: z.string().min(1).max(998).optional(),
});

const draftFields = {
    from: address.optional(),
    to: z.array(address).max(50).optional(),
    cc: z.array(address).max(50).optional(),
    bcc: z.array(address).max(50).optional(),
    reply_to: z.array(address).max(20).optional(),
    subject: z.string().max(998).optional(),
    text_body: z.string().max(1_000_000).optional(),
    html_body: z.string().max(1_000_000).optional(),
    custom_headers: z.record(
        z.string().regex(/^X-[A-Za-z0-9-]{1,120}$/),
        z.string().max(998),
    ).optional(),
    attachments: z.array(attachment).max(10).optional(),
};

export const zCreateDraftBody = z.strictObject({
    ...draftFields,
    source: z.strictObject({
        message_id: z.string().min(1).max(255),
        action: z.enum(["reply", "reply_all", "forward", "adopt"]),
    }).optional(),
});

export const zUpdateDraftBody = z.strictObject({
    ...draftFields,
    expected_revision: z.number().int().positive(),
});

const zScheduledFor = z.iso.datetime({ offset: true }).regex(/^(?!.*\.\d{4})/);

const zSendNowBody = z.strictObject({
    expected_revision: z.number().int().positive(),
    expected_schedule_version: z.number().int().nonnegative().max(2_147_483_647)
        .optional(),
});

export const zSendDraftBody = zSendNowBody.or(
    zSendNowBody.extend({
        expected_schedule_version: zSendNowBody.shape.expected_schedule_version
            .unwrap(),
        scheduled_for: zScheduledFor,
    }),
);

export const zScheduleDraftBody = z.strictObject({
    expected_revision: z.number().int().positive(),
    expected_schedule_version: z.number().int().nonnegative().max(
        2_147_483_647,
    ),
    scheduled_for: zScheduledFor.nullable(),
});

export const zDraftId = z.strictObject({ draftId: z.string().min(1).max(255) });
