import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zYoutubeCommentsBody } from "./schema/inputs.ts";

/**
 * `POST /v1/youtube/comments` — one page of a video's comments, or of one
 * comment's replies. 1 unit per call, billed only when `results` is
 * non-empty ⇒ leaf PER_UNIT counted off the response.
 */
export default defineEndpoint({
    meta: {
        displayName: "Stophy YouTube Comments",
        summary: "A YouTube video's comments, or one comment's replies.",
        description: "Get a page of a YouTube video's comments " +
            "(`commentId`, `text`, `authorName`, `likes`, `replies`, " +
            "`publishedAt`, `isPinned`, `repliesCursor`). Send `videoUrl` " +
            "or `videoId`, not both. `sort` is top (default) or newest. " +
            "To read one comment's replies, send its `repliesCursor` as " +
            "`comment`. Page by sending back the response's `cursor`.",
        docsUrl:
            "https://docs.stophy.dev/api-reference/endpoint/youtube-comments",
        categories: ["youtube"],
        notes: [
            "1 Stophy call when comments come back; an empty answer is free.",
        ],
    },
    request: { method: "POST", path: "/youtube/comments" },
    input: {
        schema: {
            body: z.union([
                zYoutubeCommentsBody.omit({ videoId: true })
                    .required({ videoUrl: true }),
                zYoutubeCommentsBody.omit({ videoUrl: true })
                    .required({ videoId: true }),
            ]),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "comment pages with results",
            description: "one call that returned at least one comment",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        /** Bills only when `results` is non-empty — Stophy charges nothing
         *  for an empty answer. */
        evidence: ({ data, utils }) => {
            const results = utils.json.optionalGet(
                data.output,
                "$.data.results",
            );
            return {
                counts: {
                    RESULT: Array.isArray(results) && results.length > 0
                        ? 1
                        : 0,
                },
            };
        },
    },
});
