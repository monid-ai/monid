import { defineProvider, presets } from "@shared/core";

/**
 * call4me (https://call4.me) — an AI caller that phones a business for the
 * user and holds a natural conversation to get something done (book,
 * reschedule, cancel, ask), then reports the outcome, a recap and the
 * transcript. REST at `https://call4.me/api`, Bearer auth (a `cb_live_…`
 * key), published OpenAPI at https://call4.me/api/openapi.json (v1.3.0).
 * The same operations are an MCP server at https://call4.me/mcp.
 *
 * THE FLOW: `GET /requirements/{category}` says what a kind of call needs
 * before dialing; `POST /calls` refuses with 422 "Not calling yet" (and
 * dials nothing) until it is all there; the call is then followed with
 * `GET /calls/{id}?wait_seconds=…` until `finished`. Here the RUN IS THE
 * CALL (the saperly place-calls posture): `call4me#calls` stays RUNNING
 * while the phone call is live, completes with the recap, and stopping
 * the run hangs up.
 *
 * RATE CARD (https://call4.me, checked 2026-10-16): prepaid, $0.25 per
 * minute in the US, Canada and Europe, counted from pickup by a person or
 * a phone menu and rounded up; hold time is half price; unanswered calls
 * are free. Credits for `max_minutes` are held at dial time; a finished
 * call reports its charge in `cost_cents`. Every other route is free.
 *
 * POOLED TENANCY: Monid holds ONE call4me account for every workspace, so
 * the connector stays off the account-wide surfaces. No list of calls (it
 * would return every workspace's calls), no saved profile (one
 * workspace's name and insurance would be filled into another's calls),
 * no balance and no number management. The caller states who the call
 * is for on every call (`on_behalf_of` is required), and the account
 * profile fields reported by /requirements are projected away.
 */
export default defineProvider({
    name: "call4me",
    meta: {
        displayName: "call4me",
        summary:
            "An AI caller that phones a business for you and returns the outcome, recap and transcript.",
        description:
            "call4me places real outbound phone calls to businesses on a " +
            "user's behalf: doctor, dentist and vet appointments, " +
            "restaurant reservations, car service and dealerships, home " +
            "services, salons, internet providers, airline rebookings and " +
            "questions for any business (hours, stock, quotes, order " +
            "status). The caller navigates phone menus, waits on hold and " +
            "holds a natural conversation, then returns a structured " +
            "outcome, a one-paragraph recap and the transcript. It calls " +
            "FOR a named person and never claims to be them.",
        homepageUrl: "https://call4.me",
        docsUrl: "https://call4.me/api/openapi.json",
        categories: ["agentic-phone"],
        notes: [
            "Billed per answered minute from the call's own meter " +
            "(cost_cents): $0.25/min in the US, Canada and Europe, from " +
            "pickup by a person or a phone menu, rounded up; hold time is " +
            "half price; unanswered calls are free. Other destinations " +
            "carry their own per-minute rate.",
            "Everything the caller may say must be given up front: the " +
            "category's required details, facts it may share, and the " +
            "flexibility it may accept without asking.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: {
        baseUrl: "https://call4.me/api",
        headers: { Accept: "application/json" },
    },
    usage: { credits: { default: { label: "US dollars" } } },
    output: {
        /** call4me errors are non-2xx `{ error: string }` bodies (the 422
         *  "Not calling yet" lists exactly what is missing). The raw body
         *  rides under `raw`. */
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(data.output, "$.error");
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : "call4me API error",
                raw: data.output,
            };
        },
    },
});
