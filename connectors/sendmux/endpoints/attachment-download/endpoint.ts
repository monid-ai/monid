import { defineEndpoint, type Json, UsageModelKind } from "@shared/core";
import { zAttachmentIds, zMailboxSelection } from "../../schema/reads.ts";

export default defineEndpoint({
    meta: {
        displayName: "Get Attachment Download",
        summary: "Get a bounded download link for one message attachment.",
        description:
            "Read an attachment's download link from a message in an owned inbox.",
        categories: ["agent-email"],
        notes: [
            "Download the file from the returned URL; the link is short-lived.",
        ],
    },
    endpoint: "/attachment-download",
    request: { method: "GET", path: "/mailbox/messages/{message_id}" },
    input: {
        schema: { pathParams: zAttachmentIds, queryParams: zMailboxSelection },
    },
    resources: {
        reads: [{ id: "sendmux/mailbox", key: "$.queryParams.mailbox_id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
    lifecycle: {
        start: async ({ data, utils }) => {
            const $ = utils.json;
            const res = await utils.http({
                method: "GET",
                path: "/api/v1/mailbox/messages/" +
                    encodeURIComponent(data.input.pathParams!.message_id),
                queryParams: {
                    mailbox_id: $.str(
                        data.input.queryParams ?? {},
                        "$.mailbox_id",
                    ),
                },
            });
            if (res.status !== 200) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const attachments = $.get(res.body, "$.data.attachments") as Json[];
            const wanted = $.str(
                data.input.pathParams ?? {},
                "$.attachment_id",
            );
            for (const item of attachments) {
                if ($.optionalStr(item, "$.id") === wanted) {
                    return {
                        kind: "COMPLETED",
                        httpStatus: 200,
                        output: {
                            id: wanted,
                            download_url: $.str(item, "$.download_url"),
                            filename: $.optionalStr(item, "$.filename") ?? null,
                            content_type: $.str(item, "$.content_type"),
                        } as Json,
                    };
                }
            }
            return {
                kind: "COMPLETED",
                httpStatus: 404,
                output: {
                    code: "not_found",
                    message: "Attachment not found.",
                } as Json,
            };
        },
    },
});
