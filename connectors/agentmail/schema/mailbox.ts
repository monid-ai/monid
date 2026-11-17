import type { LifecycleStartFn, OutputFromResponseFn } from "@shared/core";

/** One allowlist for native mailbox responses. Provider account/pod IDs,
 * idempotency keys and arbitrary metadata do not become public output. */
export const mailboxOutput: OutputFromResponseFn = ({ data, utils }) => {
    const $ = utils.json;
    const email = $.optionalGet(data.output, "$.email");
    // Presentation runs before provision construction. Keep malformed
    // creation results constructible here so the seed can park recovery
    // as PROVISION_CONSTRUCT rather than fail as a presentation fault.
    if (typeof email !== "string" || email.length === 0) return {};
    const displayName = $.optionalGet(data.output, "$.display_name");
    const createdAt = $.optionalGet(data.output, "$.created_at");
    const updatedAt = $.optionalGet(data.output, "$.updated_at");
    const status = $.optionalGet(data.output, "$.status");
    return {
        inboxId: email,
        email,
        ...(typeof displayName === "string" ? { displayName } : {}),
        ...(typeof createdAt === "string" ? { createdAt } : {}),
        ...(typeof updatedAt === "string" ? { updatedAt } : {}),
        ...(typeof status === "string" ? { status } : {}),
    };
};

/** GET/PATCH share the ownership-gated instance. The request's collection
 * path is an anchor; the actual item path uses the stored native ID,
 * which need not equal the public mailbox address. */
export const readOrUpdateMailbox: LifecycleStartFn = async (
    { data, utils },
) => {
    const $ = utils.json;
    const row = data.resources?.inbox;
    if (row === undefined) throw new Error("missing gated mailbox");
    const nativeId = $.str(row.data, "$.upstreamInboxId");
    const email = $.str(row.data, "$.email");
    if (
        email !== row.externalId || nativeId.length === 0 || nativeId === "." ||
        nativeId === ".."
    ) {
        throw new Error("inconsistent owned mailbox identity");
    }
    const updating = data.request.method === "PATCH";
    const res = await utils.http({
        method: updating ? "PATCH" : "GET",
        path: "/v0/inboxes/" + encodeURIComponent(nativeId),
        ...(updating
            ? {
                body: {
                    display_name: $.str(data.input.body ?? {}, "$.displayName"),
                },
            }
            : {}),
    });
    if (res.status >= 200 && res.status < 300) {
        if (
            $.optionalGet(res.body, "$.inbox_id") !== nativeId ||
            $.optionalGet(res.body, "$.email") !== email
        ) {
            return {
                kind: "COMPLETED",
                httpStatus: 502,
                providerHttpStatus: res.status,
                output: { error: "invalid_mailbox_response" },
            };
        }
    }
    return { kind: "COMPLETED", httpStatus: res.status, output: res.body };
};
