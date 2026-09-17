import type { EndpointDoc } from "@shared/core";
import { credentialEnvVarsFor } from "@monid/connector-engine";

/**
 * The drift-suite contract (design D28). DRIFT answers "has the WORLD
 * moved out from under our pinned defs?" — distinct from tests ("is our
 * code right?"): a vendor repricing failing `deno task test` would look
 * like our bug; it isn't.
 *
 * A provider ships a suite ONLY when the vendor publishes a
 * machine-readable surface to poll (apify: per-actor pricing + input
 * schemas). Providers without one are guarded by `test:live` (response
 * shapes against OUR fixtures) and the D27 per-run `mismatch` signal
 * (rates, wherever a vendor meter exists) — the runner says so per
 * provider, so coverage is explicit, never silent.
 *
 * Suites live in scripts/drift/ (not connectors/): connectors/ holds
 * closed-term DEFS the compiler consumes; drift checks are host tooling.
 */
export interface DriftFinding {
    docId: string;
    /** Which check fired (e.g. "rate", "join", "schema", "regime"). */
    check: string;
    message: string;
}

export interface DriftCtx {
    /** The provider's compiled docs (from the .output/ compile cache). */
    docs: EndpointDoc[];
    /** FIX POLICY (design D28): generated artifacts may be rewritten
     *  (schemas — git diff is the review gate); hand-pinned assertions
     *  (rates) stay alarm-only with a machine-readable re-pin report —
     *  auto-rewriting the rate card would be exactly the silent
     *  repricing the guard exists to catch. */
    fix: boolean;
    log: (line: string) => void;
    /** The suite's vendor key, already resolved by the runner — a suite
     *  never reads the environment itself. */
    token: string;
}

export interface DriftSuite {
    provider: string;
    /** The provider slug whose API key the suite polls with. The variable
     *  names follow the repo's ONE credential convention, so a suite never
     *  spells an env var itself (exit 2 when unset). */
    credentialProvider: string;
    run(ctx: DriftCtx): Promise<DriftFinding[]>;
}

/** The variables that can supply a suite's key, in precedence order —
 *  `<PROVIDER>_CREDENTIALS_API_KEY`, then the bare `<PROVIDER>_API_KEY`
 *  alias. Named for error messages as well as for the read. */
export function suiteEnvVars(provider: string): string[] {
    return credentialEnvVarsFor(provider, "apiKey");
}

/** Read a suite's key through that convention; undefined when unset or
 *  blank. `scripts/` is an allowed `Deno.env` boundary. */
export function suiteToken(provider: string): string | undefined {
    for (const name of suiteEnvVars(provider)) {
        const value = Deno.env.get(name);
        if (value !== undefined && value !== "") return value;
    }
    return undefined;
}
