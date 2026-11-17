import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zUnderstandBody } from "./schema/inputs.ts";

/**
 * `POST /v1/understand`: what Pressfront reads a situation as, before any
 * trace. The site's front-door translator: the caller's own words (and
 * optional screenshots or PDFs) in, `{understood}` out: a name or a story,
 * the search it would run, the people and camps named, two or three
 * "Looking into" lines, the posts shown in the files. Starts nothing and
 * stores nothing (the text and files are read and dropped).
 *
 * SYNC: one model read, a few seconds (longer with files). $0.05 on the 200
 * only; a 422 `unclear` (nothing to look up), a 400 bad input, a 429 daily
 * cap or a 503 `busy` settle as data and are zero-billed.
 */
export default defineEndpoint({
    meta: {
        displayName: "Pressfront Understand a Situation",
        summary: "Say what is going on in your own words; get back what " +
            "Pressfront would trace: a name or a story, and what it would " +
            "look into.",
        description: "Send the situation in your own words (`text`, " +
            "optionally with screenshots or PDFs as `files`) and get back " +
            "what Pressfront understood, without starting anything: `kind` " +
            "(target = an X or Bluesky name, claim = a story going around), " +
            "`query` (what a trace would run on), `handle`, `claim`, the " +
            "`people` and `sides` named as written (never judged), `lines` " +
            "(two or three plain 'Looking into' lines), `missing` (one thing " +
            "that would sharpen the search), `seen` (what was read in each " +
            "file), `seeds` (posts the search would start from), `also` " +
            "(other stories in the text) and `period` (time words, like 'for " +
            "10 months'). Use it to check the read with a person before " +
            "paying for a trace, then start one with pressfront#traces " +
            "(send the same `text`, or the `query` as `name` or `claim`). " +
            "The words are read by a language model and never stored. " +
            "Nothing to look up answers 422 `unclear` and costs nothing.",
        docsUrl: "https://pressfront.co/developers",
        categories: ["twitter"],
    },
    request: { method: "POST", path: "/understand" },
    input: { schema: { body: zUnderstandBody } },
    // one model read; files make it slower
    timeouts: { requestMs: 45_000, runMs: 60_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            // $0.05 per situation understood (pressfront.co/developers)
            consumes: { credit: "default", amount: 0.05 },
            label: "understand",
        },
    },
});
