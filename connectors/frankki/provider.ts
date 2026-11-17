import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * FrankKi (frankki.app) prints a letter and posts it: Deutsche Post and
 * partner carriers, Germany and international destinations, standard,
 * tracked, and registered mail.
 *
 * ONE host, ONE key: every endpoint is a POST under
 * `https://backend.frankki.app/api/v1/public/monid/letter`, authenticated by
 * the `X-FrankKi-Lane-Key` header FrankKi issues to Monid. FrankKi's guest
 * lane for Monid is the same rail as its ChatGPT app and website: content
 * screening, a human review tier for borderline letters, a country gate, and
 * no checkout without a rendered preview.
 *
 * BILLING: FREE. No call costs Monid anything. The letter itself is paid by
 * the person sending it, on a Stripe page FrankKi hosts (the `checkout`
 * endpoint returns that link). Stripe only places a hold; FrankKi captures it
 * once the letter is handed to the carrier and releases it if the letter is
 * rejected in review. Monid never holds money for a letter.
 *
 * ENVELOPE: every response is `{status, code, message?, data, requestId}`.
 * `fromResponse` unwraps `data` on success. A 202 (`CONTENT_REVIEW_PENDING`)
 * is a 2xx that is not a success, so it is relayed whole: the agent needs the
 * code. Errors (4xx/5xx) carry `code` and a bilingual `message`.
 */
export default defineProvider({
    name: "frankki",
    meta: {
        displayName: "FrankKi",
        summary: "Send a real printed letter by post: quote, write, preview, " +
            "pay by link, track.",
        description: "FrankKi prints a letter and posts it to a street " +
            "address in Germany or abroad. An agent quotes the postage, " +
            "checks the recipient address, composes the letter, shows the " +
            "user the rendered pages, and returns a payment link. The user " +
            "pays FrankKi on a Stripe page; FrankKi then prints and posts " +
            "the letter, and a tracking token follows its status. Standard, " +
            "tracked, and registered mail, black-and-white or colour, up to " +
            "95 pages. FrankKi reviews letter content " +
            "before posting and refuses threats, harassment, and fraud.",
        homepageUrl: "https://frankki.app",
        docsUrl: "https://frankki.app/en/developers",
        categories: ["postal-mail"],
        notes: [
            "The order is fixed: compose returns a draftToken and a " +
            "trackingToken; preview that draftToken and show the user the " +
            "page images; only then call checkout. Checkout refuses a " +
            "draft that has no rendered preview and answers PREVIEW_REQUIRED.",

            "Nothing is posted and nothing is charged until the user opens " +
            "the checkoutUrl and pays. Give the user the link; never claim " +
            "the letter was sent before they paid.",

            "quoteCents, amountCents, and userCents are integer euro cents, " +
            "VAT included. The price depends on the recipient " +
            "country, page count, colour, and delivery method, so quote " +
            "with the same inputs you compose with.",

            "Error messages are bilingual: German first, then the English " +
            "text after 'EN:'. Codes: VALIDATION_ERROR (400), NOT_FOUND " +
            "(404, includes an expired draft), PREVIEW_REQUIRED and " +
            "NOT_SUPPORTED (409, e.g. a country or method FrankKi does not " +
            "ship), CONTENT_REJECTED (422, the letter will not be printed), " +
            "RATE_LIMITED (429).",

            "CONTENT_REVIEW_PENDING arrives as HTTP 202 on checkout: the " +
            "letter is borderline and a person at FrankKi decides within " +
            "36 hours. Tell the user; the letter is not posted until then.",

            "Keep the trackingToken from compose. It is the only way to " +
            "look the order up later, and FrankKi cannot recover it.",
        ],
    },
    auth: { inject: presets.auth.header("X-FrankKi-Lane-Key") },
    request: {
        baseUrl: "https://backend.frankki.app/api/v1/public/monid/letter",
    },
    timeouts: { requestMs: 30_000, runMs: 35_000 },
    output: {
        /** Unwrap FrankKi's `{status, code, data, requestId}` envelope on
         *  success; relay any other 2xx (the 202 review hold) whole. */
        fromResponse: ({ data, utils }) => {
            const status = utils.json.optionalGet(data.output, "$.status");
            if (status !== "success") return data.output;
            const inner = utils.json.optionalGet(data.output, "$.data");
            return inner === undefined ? null : inner;
        },
        /** `{status: "error", code, message, data, requestId}` →
         *  `{message, code, raw}`. */
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(data.output, "$.message");
            const code = utils.json.optionalGet(data.output, "$.code");
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : "FrankKi API error",
                ...(typeof code === "string" ? { code } : {}),
                raw: data.output,
            };
        },
    },
    usage: {
        // FREE (D25/D27): no call is billed. The letter is paid by the
        // user on FrankKi's own Stripe checkout, outside Monid.
        model: { kind: UsageModelKind.FREE },
    },
});
