import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSocialbladeScraperBody } from "./schema/inputs.ts";

/**
 * benthepythondev/socialblade-scraper — SocialBlade creator statistics.
 *
 * PURE DATA: the async machinery (lifecycle + fromError + the generic
 * usage.evidence, rows → the sole metered line) is inherited from the
 * apify provider; the actorId is baked into the start path.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Creator Stats from SocialBlade",
        summary: "SocialBlade statistics for YouTube, TikTok, Instagram and " +
            "Twitch creators: followers, views, grade, ranks, daily history.",
        description: "Reads the public SocialBlade page of each creator " +
            "profile given as a SocialBlade, YouTube, TikTok, Instagram or " +
            "Twitch URL and returns one row per creator: subscribers or " +
            "followers, total views or likes, uploads, SocialBlade grade " +
            "and ranks, 30-day gains, estimated earnings ranges where " +
            "SocialBlade shows them, and the daily history of the last 15 " +
            "days. Useful to compare creators or vet influencers without " +
            "logging in to any platform.",
        docsUrl: "https://apify.com/benthepythondev/socialblade-scraper",
        categories: ["youtube", "tiktok", "instagram"],
        notes: [
            "trackHistory (a history store kept in the runner's account) is " +
            "not offered here: every caller would share one store.",
        ],
    },
    endpoint: "/benthepythondev/socialblade-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/benthepythondev~socialblade-scraper/runs",
    },
    // up to 100 profiles per run at a few seconds each
    timeouts: { runMs: 600_000 },
    input: {
        schema: {
            // profileUrls drives the row count — required at the binding
            body: zSocialbladeScraperBody
                .omit({ trackHistory: true })
                .required({ profileUrls: true }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                actor_start: {
                    kind: UsageModelKind.PER_CALL,
                    label: "actor start",
                    // vendor charge event: "apify-actor-start", one per
                    // started GB; the actor runs at 512 MB → one event
                    consumes: { credit: "default", amount: 0.00004 },
                },
                default_dataset_item: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "creator profiles",
                    // vendor charge event: "apify-default-dataset-item"
                    consumes: { credit: "default", amount: 0.0024 },
                },
            },
        },
        /** one row per profile, at most maxProfiles (actor default 10) */
        estimate: ({ data }) => ({
            counts: {
                default_dataset_item: Math.min(
                    data.input.body.profileUrls.length,
                    data.input.body.maxProfiles ?? 10,
                ),
            },
        }),
    },
});
