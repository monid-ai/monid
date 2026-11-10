import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { enrichCredits } from "../../schema/enrich-cost.ts";
import { SUB_ACCOUNT_BINDING } from "../../schema/sub-account.ts";
import { zEnrichBody } from "./schema/inputs.ts";

/**
 * /enrich: `POST /v1/enrich` for one place. The provider relay adds
 * `X-Sub-Account`.
 *
 * BILLING. VOYGR bills in credits and its answer carries no credit count,
 * so `estimate` and `evidence` are one fn (schema/enrich-cost.ts), one entry
 * on the compiled doc. The estimate is the fold over the request, the most a
 * request can bill. The settle runs the same fn with the answer in hand and
 * can only lower that: it drops what VOYGR does not bill. A request stopped
 * as `agent_unavailable` bills only its standard lane, and a request that
 * also researches or checks drops the standard lane when none of its values
 * came back. A non-2xx answer bills nothing.
 *
 * TIME. Our own CLI waits 90 s for a standard request and 3,700 s for a
 * research one, so the request here waits 3,700 s: a research request is not
 * cut off by this side. (Nothing in Monid's schema or engine caps a request's
 * length; whether the hosted runtime does is not known from this repo.)
 */
export default defineEndpoint({
    meta: {
        displayName: "Enrich Place",
        summary:
            "Get opening hours, phone, website and custom research fields for a place.",
        description:
            "Enrich one place. The standard attributes are opening hours, " +
            "phone, website, " +
            "Facebook, Instagram, TikTok, X, email, whether it exists and " +
            "whether it is open. Any other name is a custom research field " +
            "(for example `wheelchair_accessible`), answered by a bounded " +
            "research loop. `owners` and `key_people` return the people " +
            "behind a business, with phone, email or LinkedIn on request. " +
            "Optional checks confirm the business name and its trading or " +
            "registered address first. Send a name and an " +
            "address or coordinates. Standard attributes come with a " +
            "confidence of high, medium or low.",
        docsUrl: "https://api.voygr.tech/docs",
        categories: ["maps"],
        notes: [
            "Billed in VOYGR credits: 1 if you ask for any standard " +
            "attribute (however many), plus 1 per research field, plus 1 " +
            "for `verify_name` or `verify_address` and 1 for " +
            "`verify_registered_address`. `owners` and `key_people` cost 2, " +
            "plus 1 per contact in `include`. A refused request costs " +
            "nothing.",
            "Research requests can take minutes. This endpoint waits up to " +
            "3,700 seconds for the answer.",
            "A name one typo away from a standard attribute, such as " +
            "`openning_hours`, gets a 400 and is not researched.",
            "Takes one place per call, with no list, sample or dry run. " +
            "Use `max_credits` to cap what a request may cost.",
            "The charge here comes from the request and the response. " +
            "VOYGR may charge less for a research run stopped by a cost " +
            "cap.",
        ],
    },
    endpoint: "/enrich",
    request: { method: "POST", path: "/v1/enrich" },
    input: { schema: { body: zEnrichBody } },
    timeouts: { requestMs: 3_700_000, runMs: 3_700_000 },
    resources: { uses: [SUB_ACCOUNT_BINDING] },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            label: "credits",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: enrichCredits,
        evidence: enrichCredits,
    },
});
