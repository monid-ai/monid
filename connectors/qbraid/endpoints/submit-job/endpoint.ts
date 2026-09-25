import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSubmitJobBody } from "./schema/inputs.ts";

/** POST /jobs — submit job */
/**
 * `POST /jobs` — THE billable endpoint of the connector.
 *
 * Cost = the job's `data.estimatedCost` on the 201 envelope, in qBraid
 * credits (qbraid-runtime-api jobs_create.py prices it from the device's
 * perTask/perShot/perMinute card and writes it on the created job;
 * qbraid-api's toPublicJob allowlists it through). That figure is the
 * VENDOR'S OWN claim (design D27): `usage.consolidate` plucks it out of the
 * payload and it settles the run; `usage.evidence` restates it as the
 * metered quantity so the derived fold agrees to the credit.
 *
 * Why the line is metered in MILLIONTHS of a credit: the engine folds
 * `ceil(quantity / every) × amount`, and qBraid quotes fractional credits
 * rounded to 6 decimals (qbraid-api number-utils CREDIT_PRECISION_DECIMALS)
 * — a count in whole credits would ceil 2.35 to 3 and ride out as a
 * mismatch on every priced job. `round(estimatedCost × 1e6)` at
 * `amount: 0.000001` folds exactly.
 *
 * `usage.estimate` promises NOTHING (`{counts: {}}`, 0 credits): the price
 * is a device fact (per-task + per-shot + per-minute rates) that the input
 * alone cannot yield, and the estimate hook does no IO. Callers price a job
 * with `qbraid#estimate-job-cost` first — the description says so.
 *
 * `lifecycle.start`: qbraid-api answers 201 even when the submission was
 * rejected (`{success: false, data: {}}` — controller `newJob.success ||
 * false`). A declarative doc cannot turn that into a non-2xx, so the start
 * relays the request and synthesizes a 502 for a 2xx whose `success` is not
 * `true` (the minimax posture) — the engine then zero-bills it.
 */
export default defineEndpoint({
    meta: {
        displayName: "Submit Quantum Job",
        summary: "Run a program on a QPU or simulator — spends qBraid credits.",
        description: "Submit a quantum program to run on a quantum device " +
            "or simulator. THIS SPENDS qBraid CREDITS: the job's estimated " +
            "cost (scaling with shots and the device's perTask / perShot / " +
            "perMinute pricing; 100 credits = $1 USD) is charged when the " +
            "platform accepts it and is not refundable once the device " +
            "takes the job. Call qbraid#estimate-job-cost with the same " +
            "deviceQrn and shots first and confirm the number with the " +
            "user; the qbraid:qbraid:sim:qir-sv simulator is free. " +
            "program is {format, data}: format must be one of the " +
            "device's runInputTypes from qbraid#get-device (qasm2, qasm3, " +
            "quil, qir.ll, ionq.circuit.v0, …) and data the program " +
            "source; an array of programs submits one batch job of up to " +
            "2000 circuits. Validate OpenQASM with qbraid#validate-qasm " +
            "first — a malformed program wastes credits and queue " +
            "position — and preview circuits of up to 20 qubits for free " +
            "with qbraid#simulate-circuit. Returns the created job " +
            "(jobQrn, status INITIALIZING, shots, deviceQrn); the charged " +
            "amount is reported as this run's usage in qBraid credits. " +
            "Poll qbraid#get-job until the status is terminal, then read " +
            "qbraid#get-job-result. A submission the platform rejects " +
            "(device not found, insufficient credits, unsupported format) " +
            "settles as a provider error and bills nothing. Suited to " +
            "simple circuits — Bell, GHZ, small Grover — or when the user " +
            "supplies program code directly; circuits that need Python " +
            "generation belong in the qBraid SDK.",
        docsUrl: "https://docs.qbraid.com/v2/api-reference",
        categories: ["quantum-computing"],
        notes: [
            "The usage estimate is always 0: the price depends on the " +
            "device's rate card, which the input alone cannot yield. " +
            "qbraid#estimate-job-cost is the quote.",
        ],
    },
    endpoint: "/submit-job",
    request: { method: "POST", path: "/jobs" },
    input: { schema: { body: zSubmitJobBody } },
    timeouts: { requestMs: 60_000, runMs: 90_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 0.000001 },
            label: "job cost",
            description: "the job's estimatedCost, counted in millionths " +
                "of a qBraid credit (qBraid rounds credits to 6 decimals)",
        },
        /** Not deducible from the input (see the file comment). */
        estimate: () => ({ counts: {} }),
        /** The claim restated as the metered quantity — settle-side twin
         *  of the (empty) estimate. Absent field ⇒ no count. */
        evidence: ({ data, utils }) => {
            const cost = utils.json.optionalNum(
                data.output,
                "$.data.estimatedCost",
            );
            return {
                counts: {
                    ...(cost !== undefined
                        ? { CREDIT: Math.round(cost * 1_000_000) }
                        : {}),
                },
            };
        },
        /** The vendor's OWN claim (design D27), plucked out of the
         *  payload in one motion — the receipt lives in usage.credits,
         *  not twice. Zero claims prune (the free simulator bills
         *  nothing); an absent field falls back to the derived fold. */
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(
                data.output,
                "$.data.estimatedCost",
            );
            return {
                credits: {
                    ...(typeof value === "number" ? { default: value } : {}),
                },
                output: rest,
            };
        },
    },
    lifecycle: {
        start: async ({ utils, logger }) => {
            const res = await utils.request();
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            // 201 + success:false = rejected submission (qbraid-api
            // createJob answers 201 regardless). Nothing was queued; the
            // synthesized 502 keeps it out of the billing gate.
            if (utils.json.optionalGet(res.body, "$.success") !== true) {
                logger.warn(
                    "qbraid 2xx without success:true — synthesizing 502",
                    {
                        status: res.status,
                    },
                );
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: res.status,
                    output: res.body,
                };
            }
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
            };
        },
    },
});
