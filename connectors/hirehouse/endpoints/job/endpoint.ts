import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zJobPathParams } from "./schema/inputs.ts";

/** GET /jobs/{id} — one public job with its full description. */
export default defineEndpoint({
    meta: {
        displayName: "HireHouse Get Job",
        summary: "Get one open job with its full description.",
        description: "Get the public details of one HireHouse job by its ID " +
            "(from hirehouse#jobs/search): title, company, work mode, " +
            "location, pay range, publish date, the full description as " +
            "Markdown ('requirements') and the applyUrl where the candidate " +
            "applies. A closed or unlisted job answers 404 not_found.",
        docsUrl: "https://hirehouse.xyz/developers#endpoints",
    },
    request: { method: "GET", path: "/jobs/{id}" },
    input: { schema: { pathParams: zJobPathParams } },
    usage: { model: { kind: UsageModelKind.FREE } },
});
