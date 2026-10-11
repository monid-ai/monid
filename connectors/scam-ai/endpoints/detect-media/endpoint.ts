import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zDetectBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Detect Media",
        summary: "Score a public image, video, or audio URL for AI generation.",
        description: "Submit one public https:// media URL and get back the " +
            "detection envelope: verdict (LIKELY_REAL, ALERT, or LIKELY_AI), " +
            "a 0–1 detection score, a short " +
            "summary, and the media metadata. The platform infers the media " +
            "type server-side — image, video, and audio all ride " +
            "this one endpoint. Video runs add per-frame scores " +
            "(threshold_used, frames[]), audio runs add segment scores " +
            "(duration_ms, segments[]), and URL runs echo a source block " +
            "with any platform metadata the link resolver found.",
        docsUrl: "https://scam.ai/docs/detect-link",
        categories: ["ai-detection"],
        notes: [
            "Synchronous for every media type, video included: the answer " +
            "arrives in this call's response — there is no job handle to " +
            "poll.",
            "The rate card is media-dependent: image 1 credit; video 1 " +
            "credit per scored frame (capped at 20); audio 1 credit " +
            "per minute, rounded up, minimum 1. The " +
            "response's own credits_used settles the bill.",
            "The pre-run estimate assumes a billable image (1 credit). " +
            "The platform resolves the media type and actual charge after " +
            "fetching the URL; recognised duplicates and sandbox keys " +
            "can settle at zero.",
            "402 means the key is out of credits (never a reassuring " +
            "verdict); 429 is rate limiting.",
        ],
    },
    request: { method: "POST", path: "/v1/detections" },
    input: { schema: { body: zDetectBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            every: 1,
            label: "Scam AI credits",
            description: "media-dependent draw — image 1, video 1 per " +
                "scored frame (max 20), audio 1 per minute rounded up; " +
                "the response's credits_used is the " +
                "vendor's own meter and settles the run",
            consumes: { credit: "default", amount: 1 },
        },
        // Media type is resolved server-side from the URL's content, so the
        // pre-run estimate assumes a billable image. The actual meter may be zero.
        estimate: () => ({ counts: { CREDIT: 1 } }),
        // Strict on purpose: a success envelope without the vendor's meter
        // fails the run rather than settling a wrong bill.
        evidence: ({ data, utils }) => ({
            counts: { CREDIT: utils.json.num(data.output, "$.credits_used") },
        }),
    },
});
