import type { RunState, RunStopResult } from "@shared/core";

export const EngineErrorCode = {
    /** Doc requires a newer engine (minEngineVersion > ENGINE_VERSION). */
    UNSUPPORTED_DOC: "UNSUPPORTED_DOC",
    /** A $fn key has no entry in the sealed unit. */
    UNKNOWN_FN: "UNKNOWN_FN",
    /** sha256(entry.src) does not equal the referenced key — tampering/skew. */
    LINK_INTEGRITY: "LINK_INTEGRITY",
    /** Fn entry targets a newer fn ABI than this engine. */
    UNSUPPORTED_FN_ABI: "UNSUPPORTED_FN_ABI",
    /** Doc failed schema parsing. */
    BAD_DOC: "BAD_DOC",
    /**
     * A linked fn broke its slot contract: invalid ctx.data, a throw, or an
     * invalid return (validated against the SAME zod slot schemas that type
     * the def). Absorbs the former BAD_USAGE as the usage-slot case.
     */
    FN_CONTRACT: "FN_CONTRACT",
    /** Caller input failed the endpoint's input schemas. */
    INVALID_INPUT: "INVALID_INPUT",
    /** Resolved auth params failed the provider's authParams schema. */
    MISSING_CREDENTIAL: "MISSING_CREDENTIAL",
    /** Transport-level failure (network, abort). RETRIABLE. */
    EXECUTION_FAILED: "EXECUTION_FAILED",
    /** Response body could not be decoded at all. */
    DECODE_FAILED: "DECODE_FAILED",
    /** Final output failed output.schema (post-transform contract). */
    CONTRACT_VIOLATION: "CONTRACT_VIOLATION",
    /** poll/stop called on a sync endpoint. */
    NOT_ASYNC: "NOT_ASYNC",
    /** run() exceeded timeouts.runMs. Carries TimeoutDetails: the stop
     *  verdict + the last threaded state (the vendor handle to reconcile
     *  with — a metered async job may still be BILLING). */
    TIMEOUT: "TIMEOUT",
    /** Doc declares a `resource` binding but EngineCtx carries no
     *  ResourceReader — a HOST wiring gap, caught at load() (fail-closed:
     *  a bound endpoint without its ownership window must not run). */
    NO_RESOURCE_READER: "NO_RESOURCE_READER",
    /** A fn touched `utils.resources` on a doc with NO `resource` binding
     *  — capability follows declaration (design D32); undeclared access
     *  is a doc-authoring bug, fail-closed. */
    RESOURCES_UNDECLARED: "RESOURCES_UNDECLARED",
    /** The seed/ensure fn produced an invalid provision record (or seed
     *  data failed the resource doc's dataSchema) — the run SUCCEEDED
     *  upstream but its provision cannot be persisted; distinct from
     *  FN_CONTRACT so hosts alarm it as money-critical. */
    PROVISION_CONSTRUCT: "PROVISION_CONSTRUCT",
    /** A resource op (check/release/refresh/getActualCost/external read)
     *  failed non-deterministically. RETRIABLE — the host activity
     *  retries on its own schedule. */
    RESOURCE_OP_FAILED: "RESOURCE_OP_FAILED",
    /** Reserved surface (relayTransport stub). */
    NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
} as const;
export type EngineErrorCode =
    (typeof EngineErrorCode)[keyof typeof EngineErrorCode];

const RETRIABLE: ReadonlySet<EngineErrorCode> = new Set([
    EngineErrorCode.EXECUTION_FAILED,
    EngineErrorCode.RESOURCE_OP_FAILED,
]);

/**
 * What a TIMEOUT carries out of `run()` (design D34's resolution duty,
 * stated on the throw): the stop verdict AND the last threaded run state.
 * A metered async endpoint can be BILLING while the run budget expires —
 * WITHOUT these handles a caller can only retry, which buys the vendor job
 * a SECOND time. With them a host reconciles (`externalRunId`) or resumes
 * watching instead.
 *
 * Both fields hold engine-validated data only: ids, the fn's dispatch
 * marker, and the typed billing-signal bag (`state.data`, capped by
 * `schema.state_max_bytes`) — never credentials, never vendor payloads.
 */
export interface TimeoutDetails {
    /** `stop()`'s verdict — `kind`, plus `reason`/`state` when RESOLVED
     *  to UNRESOLVED (the fn's own last sighting of the vendor job). */
    stop: RunStopResult;
    /** The last threaded state (THE `tick.state` the stop was called
     *  with). Present even for STOPPED_UNSETTLED, where the stop result
     *  itself states nothing — `externalRunId` stays recoverable. */
    state: RunState;
}

export class EngineError extends Error {
    readonly code: EngineErrorCode;
    readonly retriable: boolean;
    /** Structured payload for the codes that carry one (TIMEOUT — see
     *  TimeoutDetails). Absent for every other code. */
    readonly details?: TimeoutDetails;

    constructor(
        code: EngineErrorCode,
        message: string,
        options?: { cause?: unknown; details?: TimeoutDetails },
    ) {
        super(`[${code}] ${message}`, options);
        this.name = "EngineError";
        this.code = code;
        this.retriable = RETRIABLE.has(code);
        if (options?.details !== undefined) this.details = options.details;
    }
}
