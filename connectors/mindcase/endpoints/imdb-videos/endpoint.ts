import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zImdbVideosBody } from "./schema/inputs.ts";

/**
 * Mindcase `imdb/videos`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "IMDb Videos",
        summary: "IMDb titles with original title, type, year, end year and " +
            "the IMDb URL. Search by keyword or pass title IDs.",
        description:
            "IMDb titles with original title, type, year, end year and " +
            "the IMDb URL. Search by keyword or pass title IDs. Returns " +
            "one row per video with imdbId, title, originalTitle, " +
            "imdbUrl, type, year, endYear, releaseDate, rating, votes, " +
            "runtimeMin, genres, plot, certificate, metascore, " +
            "metascoreReviews, topRank, countries, languages, isSeries, " +
            "isEpisode, seasons, totalEpisodes, isOngoing, budget, " +
            "budgetCurrency, grossWorldwide, grossWorldwideCurrency, " +
            "openingWeekendGross, openingWeekendCurrency and 12 more " +
            "fields. Call it by search queries (searchQueries) or title " +
            "ids (titleIds). $0.003 per video; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/imdb/videos",
        categories: ["video-search"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/imdb/videos",
    request: { method: "POST", path: "/v1/data/imdb/videos/run" },
    input: {
        schema: {
            body: zImdbVideosBody.extend({
                maxResults: zImdbVideosBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe(
                        "How many videos to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.003 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
