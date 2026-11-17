import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zEspnScoresBody } from "./schema/inputs.ts";

/**
 * Mindcase `espn/scores`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "ESPN Scores",
        summary: "ESPN game scores and schedules with league, teams, start " +
            "time and a link to each game. Pick the leagues to cover.",
        description:
            "ESPN game scores and schedules with league, teams, start " +
            "time and a link to each game. Pick the leagues to cover. " +
            "Returns one row per score with gameId, url, league, " +
            "leagueName, name, shortName, startTime, status, season, " +
            "seasonName, week, homeTeam, homeTeamId, homeAbbr, homeScore, " +
            "homeRecord, homeLogo, awayTeam, awayTeamId, awayAbbr, " +
            "awayScore, awayRecord, awayLogo, winner, venue, attendance, " +
            "neutralSite, broadcasts, odds, competitors and 5 more " +
            "fields. $0.0035 per score; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/espn/scores",
        categories: ["events"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/espn/scores",
    request: { method: "POST", path: "/v1/data/espn/scores/run" },
    input: {
        schema: {
            body: zEspnScoresBody.extend({
                maxResults: zEspnScoresBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe(
                        "How many scores to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0035 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
