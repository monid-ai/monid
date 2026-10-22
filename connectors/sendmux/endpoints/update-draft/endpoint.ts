import { defineEndpoint, UsageModelKind } from "@shared/core";
import {
    zDraftId,
    zMailboxSelection,
    zUpdateDraftBody,
} from "../../schema/drafts.ts";

export default defineEndpoint({
    meta: {
        displayName: "Update Draft",
        summary: "Edit only the saved revision the caller reviewed.",
        description:
            "Update a draft's content with its expected revision. A stale revision fails with conflict.",
        categories: ["agent-email"],
    },
    endpoint: "/update-draft",
    request: { method: "PATCH", path: "/mailbox/drafts/{draftId}" },
    input: {
        schema: {
            pathParams: zDraftId,
            queryParams: zMailboxSelection,
            body: zUpdateDraftBody,
        },
    },
    resources: {
        updates: [{ id: "sendmux/mailbox", key: "$.queryParams.mailbox_id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
    lifecycle: {
        start: async ({ data, utils }) => {
            const path = "/api/v1/mailbox/drafts/" +
                encodeURIComponent(data.input.pathParams!.draftId);
            const queryParams = {
                mailbox_id: utils.json.str(
                    data.input.queryParams ?? {},
                    "$.mailbox_id",
                ),
            };
            const current = await utils.http({
                method: "GET",
                path,
                queryParams,
            });
            if (current.status !== 200) {
                return {
                    kind: "COMPLETED",
                    httpStatus: current.status,
                    output: current.body,
                };
            }
            const etag = current.headers["etag"];
            if (etag === undefined) {
                throw new Error("Draft read omitted its revision token");
            }
            const updated = await utils.http({
                method: "PATCH",
                path,
                queryParams,
                headers: { "If-Match": etag },
                body: data.input.body,
            });
            return {
                kind: "COMPLETED",
                httpStatus: updated.status,
                output: updated.body,
            };
        },
    },
});
