import { defineProvider, presets } from "@shared/core";

/**
 * Podwise (podwise.ai) — podcast summaries, chapters and speaker-labelled
 * transcripts for episodes Podwise has already processed.
 *
 * Read-only by design. `POST /episodes/{seq}/process` exists in the Podwise
 * Open API, but one episode takes minutes to process while a Monid run budget
 * is tens of seconds, so processing is deliberately NOT exposed here: an
 * endpoint that times out mid-job would settle at zero and leave the buyer
 * with nothing. The status endpoint is exposed so an agent can tell whether
 * content it found is ready before paying for a read.
 *
 * Pool: US dollars. Podwise bills us per call in dollars, so the pool is the
 * dollar, not a vendor credit.
 */
export default defineProvider({
    name: "podwise",
    meta: {
        displayName: "Podwise",
        summary: "Podcast transcripts, summaries and episode search — " +
            "160,000+ episodes already transcribed.",
        description: "Read what was said on a podcast without downloading " +
            "audio or running speech-to-text. Podwise has already " +
            "transcribed 160,000+ podcast episodes from nearly 30,000 shows " +
            "in 13 languages (English, Chinese, Japanese, Korean, Spanish, " +
            "German, French and more). Search podcast episodes by topic, " +
            "guest or company, or find a show and browse its recent " +
            "episodes, then read an episode's AI summary with " +
            "timestamped chapters, or its full transcript with speakers and " +
            "timestamps. Works for audio-only podcasts that have no video " +
            'captions. Search is newest first, so it is good for "what are ' +
            'podcasts saying about X lately". Covers public episodes ' +
            "Podwise has processed; an " +
            "unprocessed episode reports its status instead of content.",
        homepageUrl: "https://podwise.ai",
        docsUrl: "https://podwise.ai/docs/open-api-v1",
        categories: ["podcasts"],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://app.podwise.ai" },
    // Reading a summary or transcript is a single fast call; 20s covers the
    // largest transcripts we serve.
    timeouts: { requestMs: 20_000, runMs: 25_000 },
    usage: {
        credits: { default: { label: "US dollars" } },
    },
});
