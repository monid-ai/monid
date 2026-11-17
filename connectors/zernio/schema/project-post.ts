import type { Json } from "@shared/core";

/**
 * The ONE post shape agents see, wired as `output.fromResponse` on
 * /create-post and /get-post (identical source interns to a single fnTable
 * entry). An allowlist, so the pooled account's ids and the tenancy tag in
 * `metadata` never leave.
 */
export const projectPost = (
    { data, utils }: {
        data: { output: Json };
        utils: {
            json: {
                optionalGet(value: Json, path: string): Json | undefined;
            };
        };
    },
): Json => {
    const $ = utils.json;
    const post = $.optionalGet(data.output, "$.post") ?? data.output;
    const targets = $.optionalGet(post, "$.platforms");
    return {
        postId: $.optionalGet(post, "$._id") ?? null,
        status: $.optionalGet(post, "$.status") ?? null,
        content: $.optionalGet(post, "$.content") ?? null,
        scheduledFor: $.optionalGet(post, "$.scheduledFor") ?? null,
        timezone: $.optionalGet(post, "$.timezone") ?? null,
        platforms: (Array.isArray(targets) ? targets : []).map((target) => ({
            platform: $.optionalGet(target, "$.platform") ?? null,
            accountId: $.optionalGet(target, "$.accountId._id") ??
                $.optionalGet(target, "$.accountId") ?? null,
            status: $.optionalGet(target, "$.status") ?? null,
            platformPostUrl: $.optionalGet(target, "$.platformPostUrl") ??
                null,
            publishedAt: $.optionalGet(target, "$.publishedAt") ?? null,
            errorMessage: $.optionalGet(target, "$.errorMessage") ?? null,
        })),
    };
};
