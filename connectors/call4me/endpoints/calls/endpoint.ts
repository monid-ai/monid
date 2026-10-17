import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zPlaceCallBody } from "./schema/inputs.ts";

/**
 * `POST /api/calls` — THE metered async endpoint: the RUN is the phone
 * call (the saperly place-calls posture). start dials, poll follows
 * `GET /calls/{id}?wait_seconds=20` until `finished` (the call ended AND
 * its recap is written), and stopping the run hangs up
 * (`POST /calls/{id}/hang-up`) and waits for the recap so the stop settles
 * the metered work (design D34).
 *
 * BINDING (pooled tenancy, see provider.ts): three vendor fields act on
 * the ACCOUNT rather than the call and are left out: `connect_when` and
 * `listen_in` ring the account profile's phone, and `from` picks one of
 * the account's numbers. `on_behalf_of` is required, because the vendor
 * defaults it to the account profile's name. `max_minutes` is required:
 * it is the cap the caller states and the hold the estimate prices.
 *
 * BILLING: the vendor's own meter is the quantity, one US cent per unit
 * (the firecrawl agent posture). Hold time at half price and per-country
 * rates make minutes × $0.25 an approximation, while `cost_cents` is
 * exactly what the call drew, so evidence and claim read the same field
 * and agree by construction. The estimate prices the stated cap at the
 * US/CA/EU rate and grows with the call (updateEstimateEveryMs), because
 * call4me keeps a call on hold past the cap.
 */
export default defineEndpoint({
    meta: {
        displayName: "call4me Place Call",
        summary:
            "Phone a business for the user and get something done; the run is the call and returns its outcome, recap and transcript.",
        description: "Have an AI caller phone a business and hold a natural " +
            "conversation to get something done: book, reschedule or " +
            "cancel an appointment or reservation, or ask questions " +
            "(hours, stock, quotes, order status). It navigates phone " +
            "menus and waits on hold. The RUN is the call: it stays " +
            "RUNNING while the call is live and completes with the " +
            "structured outcome (result, summary, details), the " +
            "transcript and the charge; stop the run to hang up. Read " +
            "call4me#requirements/{category} first and pass every required " +
            'field in `details`, or the call is refused with 422 "Not ' +
            'calling yet" (listing what is missing) and nothing is dialed. ' +
            "The caller cannot ask you anything mid-call through this " +
            "endpoint, so give it the facts it may share and the " +
            "flexibility it may accept without asking.",
        docsUrl: "https://call4.me/api/openapi.json",
        categories: ["agentic-phone"],
        notes: [
            "Billing: $0.25 per minute in the US, Canada and Europe, from " +
            "pickup by a person or a phone menu, rounded up; hold time is " +
            "half price; unanswered, busy and failed calls are free. The " +
            "call's own cost_cents settles the run.",
            "max_minutes caps the answered call and sizes the hold; a call " +
            "still on hold at the cap keeps waiting, and the hold grows " +
            "with it.",
        ],
    },
    request: { method: "POST", path: "/calls" },
    input: {
        schema: {
            body: zPlaceCallBody
                .omit({ connect_when: true, listen_in: true, from: true })
                .required({ on_behalf_of: true, max_minutes: true }),
        },
    },
    timeouts: {
        // the poll long-waits up to 20 s for a change on the call
        requestMs: 45_000,
        pollMs: 1_000,
        // call4me holds a call at most 4 hours; the margin covers the recap
        runMs: 4 * 60 * 60 * 1000 + 15 * 60 * 1000,
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            label: "call charge",
            description: "US cents the call drew from call4me's meter " +
                "(cost_cents): $0.25/min in the US, Canada and Europe, hold " +
                "half price",
            consumes: { credit: "default", amount: 0.01 },
        },
        /** At admission (no elapsedMs) the stated cap at 25 cents a minute;
         *  on the 30 s re-runs the elapsed minutes when the call outlives
         *  it (design D40). */
        estimate: ({ data }) => ({
            counts: {
                CREDIT: 25 * Math.max(
                    data.input.body.max_minutes,
                    Math.ceil((data.elapsedMs ?? 0) / 60_000),
                ),
            },
        }),
        updateEstimateEveryMs: 30_000,
        evidence: ({ data, utils }) => ({
            counts: {
                CREDIT: utils.json.optionalNum(data.output, "$.cost_cents") ??
                    0,
            },
        }),
        consolidate: ({ data, utils }) => {
            const cents = utils.json.optionalNum(data.output, "$.cost_cents");
            return {
                credits: {
                    ...(cents !== undefined ? { default: cents / 100 } : {}),
                },
            };
        },
    },
    lifecycle: {
        /**
         * START: the default relay posts the validated body. A refusal
         * (422 "Not calling yet", 402 low balance, 401) relays as data and
         * settles at zero; a 2xx with no readable call id is OUR 502; a
         * call born finished completes at once; else RUNNING with the call
         * id as externalRunId.
         */
        start: async ({ utils }) => {
            const $ = utils.json;
            const res = await utils.request();
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const callId = $.optionalStr(res.body, "$.id");
            if (callId === undefined) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: res.status,
                    output: {
                        error:
                            "call4me returned success but no readable call id",
                    },
                };
            }
            if ($.optionalGet(res.body, "$.finished") === true) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                    state: { externalRunId: callId },
                };
            }
            return { kind: "RUNNING", state: { externalRunId: callId } };
        },
        /**
         * POLL: one long-wait read. `finished` is the terminal signal (the
         * call ended and its recap and final cost_cents are written); a
         * terminal `status` alone is not, because the recap lands after.
         */
        poll: async ({ data, utils }) => {
            const callId = data.lifecycle.state.externalRunId;
            if (callId === undefined) {
                throw Object.assign(
                    new Error("call4me call poll without externalRunId"),
                    { retriable: false },
                );
            }
            const res = await utils.http({
                method: "GET",
                url: data.request.url + "/" + encodeURIComponent(callId),
                queryParams: { wait_seconds: "20" },
            });
            if (res.status !== 404 && (res.status < 200 || res.status >= 300)) {
                // retriable read: a 5xx, 429, 401 or 408 says nothing about
                // the call, which may still be live and metering
                throw new Error("call4me call poll failed: HTTP " + res.status);
            }
            if (res.status === 404) {
                // the call record is gone: error as data, nothing metered
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            if (utils.json.optionalGet(res.body, "$.finished") !== true) {
                return { kind: "RUNNING", state: { externalRunId: callId } };
            }
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
                state: { externalRunId: callId },
            };
        },
        /**
         * STOP: hang up (409 "the call is not live" and 404 count as
         * already ended), then up to three long-wait reads for the
         * finished record, which carries the final charge. A recap that
         * never lands in budget is UNRESOLVED: the host reconciles before
         * money settles.
         */
        stop: async ({ data, utils, logger }) => {
            const callId = data.lifecycle.state.externalRunId;
            if (callId === undefined) {
                return {
                    kind: "UNRESOLVED",
                    reason: "no call id in state, nothing to hang up",
                };
            }
            const callUrl = data.request.url + "/" +
                encodeURIComponent(callId);
            const end = await utils.http({
                method: "POST",
                url: callUrl + "/hang-up",
                body: {},
            });
            logger.info("call4me hang-up requested", {
                callId,
                status: end.status,
            });
            const hungUp = (end.status >= 200 && end.status < 300) ||
                end.status === 404 || end.status === 409;
            if (!hungUp) {
                return {
                    kind: "UNRESOLVED",
                    reason: "hang-up failed with HTTP " + end.status,
                    state: { externalRunId: callId },
                };
            }
            for (let attempt = 0; attempt < 3; attempt++) {
                const res = await utils.http({
                    method: "GET",
                    url: callUrl,
                    queryParams: { wait_seconds: "20" },
                });
                if (res.status < 200 || res.status >= 300) continue;
                if (utils.json.optionalGet(res.body, "$.finished") === true) {
                    return {
                        kind: "COMPLETED",
                        httpStatus: res.status,
                        output: res.body,
                        state: { externalRunId: callId },
                    };
                }
            }
            return {
                kind: "UNRESOLVED",
                reason: "call hung up but its recap never landed in budget",
                state: { externalRunId: callId },
            };
        },
    },
});
