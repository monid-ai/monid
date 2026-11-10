import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zFetchBody } from "../../schema/fetch.ts";

/**
 * `POST /v1/fetch` with a POST, PUT or PATCH — send a request with a body
 * to a URL and get the destination's response back. String's `/v3`
 * request tool, ported: the one endpoint here that can change data on
 * another site, kept apart from `string#fetch` so a caller can tell a
 * read from a call that may write. GET is refused, so a read never comes
 * through here; DELETE, HEAD and OPTIONS are not offered, as on `/v3`.
 *
 * `endpoint: "/request"` is declared because `string#fetch` binds the
 * same native path; the id is `string#request`.
 *
 * BILLING, from String's own published docs (pricing.mdx and
 * api-reference/fetch.mdx, read 2026-10-24): billed like `string#fetch`,
 * at the rate the RESPONSE header `x-billed-request-type` names. A
 * request with a method other than GET, or with a body, "is sent only on
 * fetch paths that deliver its method and body to the destination
 * exactly as given", and a browser loads a page with a bodiless GET, so
 * only the two request-based lines can fire. Which of the two (standard
 * or premium proxy) is picked per destination and is only known once the
 * response names it. Quoted at the Growth-tier rate.
 *
 * ESTIMATE: the standard line, an honest floor for an output-determined
 * quantity, as on `string#fetch`.
 *
 * SETTLE: the single-tick lifecycle and the evidence fn are byte-identical
 * to `string#fetch`'s (see its doc comment for why the header needs a
 * lifecycle), so both endpoints share one fnTable entry for each. The
 * evidence bills the header only when it names one of this doc's own
 * lines, and settles zero otherwise.
 */
export default defineEndpoint({
    meta: {
        displayName: "String Web Access Request",
        summary: "Send a POST, PUT or PATCH with a body to a URL and get " +
            "the destination's response back.",
        description: "Send a POST, PUT or PATCH with a body to a URL and " +
            "get the destination's response back: by default a JSON " +
            "envelope with the destination's `statusCode`, `headers` and " +
            "`data`, or the response body itself with `format` " +
            "`markdown` or `raw`. For calls that submit data rather than " +
            "read a page: a JSON API that only accepts POST, a GraphQL " +
            "endpoint, a search backend that takes a body. Some of these " +
            "calls only read, but a call can create, change or delete " +
            "data on the destination, so treat every call as one that " +
            "can. To read a page, use `string#fetch`.",
        docsUrl: "https://portal.usestring.ai/docs/api-reference/fetch",
        categories: ["web-scraping"],
        notes: [
            "A call reaches the destination at most once and is never " +
            "sent again once it may have arrived, so an error does not " +
            "mean the destination did not act on it. Check the " +
            "destination's state before sending the same request again.",
            "A destination error such as a `400` is a successful call " +
            "carrying that `statusCode`, and is billed.",
            "String can still bill a destination TLS/SSL failure when " +
            "an earlier attempt already did billable work; that `502` " +
            "names its class in `x-billed-request-type`. This connector " +
            "settles every non-2xx at zero usage, so such a charge is not " +
            "passed through.",
        ],
    },
    endpoint: "/request",
    request: { method: "POST", path: "/fetch" },
    timeouts: { requestMs: 60_000, runMs: 65_000 },
    input: {
        schema: {
            body: zFetchBody.pick({
                url: true,
                body: true,
                format: true,
                headers: true,
                countryCode: true,
                solveCaptcha: true,
            }).extend({
                method: z.enum(["POST", "PUT", "PATCH"]).describe(
                    "POST, PUT or PATCH. GET is not accepted here: read a " +
                        "page with string#fetch.",
                ),
                format: zFetchBody.shape.format.unwrap().describe(
                    "'json' (the default) for an envelope with the " +
                        "destination's statusCode, headers and data, " +
                        "'markdown' for the response as Markdown, or 'raw' " +
                        "for its body as it was sent.",
                ).default("json"),
                solveCaptcha: zFetchBody.shape.solveCaptcha.unwrap().describe(
                    "false (the default here) fails the call on a " +
                        "challenge page. true has the request attempt the " +
                        "challenge, where the key is allowed to.",
                ).default(false),
            }),
        },
    },
    lifecycle: {
        start: async ({ utils }) => {
            const res = await utils.request();
            const billedType = res.headers["x-billed-request-type"];
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
                state: { data: { billedRequestType: billedType ?? null } },
            };
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                request_standard: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "request-based, standard proxy",
                    description: "a request on a standard proxy",
                    consumes: { credit: "default", amount: 0.0002 },
                },
                request_premium: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "request-based, premium proxy",
                    description: "a request on a premium (residential) " +
                        "proxy",
                    consumes: { credit: "default", amount: 0.002 },
                },
            },
        },
        estimate: () => ({ counts: { request_standard: 1 } }),
        evidence: ({ data, utils }) => {
            const model = data.usage.model;
            const lines = model.kind === "COMPOSITE"
                ? Object.keys(model.components)
                : [];
            const billedType = utils.json.optionalGet(
                data.lifecycle?.state ?? null,
                "$.data.billedRequestType",
            );
            if (typeof billedType === "string" && lines.includes(billedType)) {
                return { counts: { [billedType]: 1 } };
            }
            return { counts: {} };
        },
    },
});
