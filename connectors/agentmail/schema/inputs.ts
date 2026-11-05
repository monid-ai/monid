import { z } from "zod";

/** Native optionality, without defaults. Public camelCase contracts are
 * derived separately at the endpoint bindings. Checked 2026-10-27:
 * https://docs.agentmail.to/api-reference/inboxes/create
 * https://docs.agentmail.to/api-reference/inboxes/update
 */
const zMetadataValue = z.union([z.string(), z.number(), z.boolean()]);

export const zNativeCreateInbox = z.object({
    username: z.string().optional(),
    domain: z.string().optional(),
    display_name: z.string().optional(),
    client_id: z.string().optional(),
    status: z.enum(["active", "paused"]).optional(),
    metadata: z.record(z.string(), zMetadataValue).optional(),
});

export const zNativeUpdateInbox = z.object({
    display_name: z.string().optional(),
    status: z.enum(["active", "paused"]).optional(),
    metadata: z.record(z.string(), zMetadataValue.nullable()).nullable()
        .optional(),
});

/** The public Monid identifier is an address, not a host resource UUID.
 * Keep the published input bounds; ownership decides whether it exists. */
export const zInboxId = z.string().min(3).max(320).describe(
    "The address of an inbox you own, returned by create-inboxes or list-inboxes.",
);

export const zCreateInboxBody = z.strictObject({
    username: zNativeCreateInbox.shape.username.unwrap().min(1).max(64)
        .optional(),
    domain: zNativeCreateInbox.shape.domain.unwrap().min(3).max(255).optional(),
    displayName: zNativeCreateInbox.shape.display_name.unwrap().min(1).max(120)
        .optional(),
});

export const zInboxBody = z.strictObject({ inboxId: zInboxId });

export const zUpdateInboxBody = zInboxBody.extend({
    displayName: zNativeUpdateInbox.shape.display_name.unwrap().min(1).max(120),
});
