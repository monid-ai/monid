import { defineEndpoint } from "@shared/core";
import {
    zAnnouncementsPathParams,
    zAnnouncementsQueryParams,
} from "./schema/inputs.ts";

const shape = zAnnouncementsQueryParams.shape;

/**
 * GET /v1/announcements/{currency}/{indicator} — release history for one
 * indicator, most recent first, one page per call (`pagination.has_more`
 * and `next_offset` say whether to ask for the next one).
 */
export default defineEndpoint({
    meta: {
        displayName: "FXMacroData Indicator History",
        summary: "Release history of one macro indicator for a currency.",
        description: "Historical releases of one indicator (inflation, " +
            "GDP, policy rate, unemployment, payrolls, retail sales and " +
            "about 120 more) for a currency, most recent first. Each row " +
            "has the period date, the value, the previous value and the " +
            "change, the announcement timestamp and how it was " +
            "established (`publication_time_status`), and the revision " +
            "history. Select the series variant with frequency (yoy, mom, " +
            "qoq, level), seasonality, annualization and revisions; " +
            "`supported_options` in the response lists what the series " +
            "offers. USD works without an API key for the last 90 days; " +
            "full history and other currencies need a key.",
        categories: ["economic-data"],
    },
    request: {
        method: "GET",
        path: "/v1/announcements/{currency}/{indicator}",
    },
    input: {
        schema: {
            pathParams: zAnnouncementsPathParams,
            queryParams: zAnnouncementsQueryParams.extend({
                limit: shape.limit.unwrap().min(1).max(100).optional(),
                offset: shape.offset.unwrap().min(0).optional(),
                page: shape.page.unwrap().min(1).optional(),
            }),
        },
    },
});
