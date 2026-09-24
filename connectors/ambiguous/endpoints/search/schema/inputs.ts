import { z } from "zod";

export const body = z.object({
    query: z.string().describe("Search query string.").optional(),
    modules: z.array(z.string()).describe(
        "Restrict to specific modules (docs, sheets, slides, tasks, etc).",
    ).optional(),
    limit: z.number().int().min(1).max(50).optional(),
    offset: z.number().int().min(0).optional(),
    from: z.array(z.string()).describe(
        "Restrict to rows authored by these people, matched against each module's author-equivalent (document owner, task assignee, message sender, mail sender) by display name or email. Multiple values widen the match.",
    ).optional(),
    has_link: z.boolean().describe("Restrict to rows that contain a link.")
        .optional(),
    has_attachment: z.boolean().describe(
        "Restrict to rows that carry an attachment.",
    ).optional(),
    before: z.string().date().describe(
        "Keep only rows created strictly before this date (YYYY-MM-DD, UTC). Bounds the row's creation timestamp — mail uses its sent date — never its last-modified time.",
    ).optional(),
    after: z.string().date().describe(
        "Keep only rows created on or after this date (YYYY-MM-DD, UTC). Same creation axis as `before`.",
    ).optional(),
    channels: z.array(z.string()).max(10).describe(
        "Chat channel names (no leading `#`). Honored by `messages` alone; every other active module drops out of the result set.",
    ).optional(),
    is: z.array(z.enum(["pinned", "starred", "thread"])).describe(
        "Chat message state. Honored by `messages` alone; every other active module drops out of the result set.",
    ).optional(),
    sort: z.enum(["relevant", "recent"]).describe(
        "`relevant` (default) is the cross-module score order; `recent` orders the merged page by `updated_at` descending before slicing, so paging stays monotonic under either.",
    ).optional(),
}).strict();
