import { z } from "zod";

/**
 * AI/ML API `GET /v1/models` query params — a mirror of what the VENDOR
 * accepts. The endpoint binding narrows it (see `../endpoint.ts`).
 *
 * `include` is the gateway's expansion knob, and it is undocumented: the
 * published `docs-json` declares no query parameters for this path. Measured
 * on 2026-10-15, each name adds one field to every row, `all` adds all four,
 * and names combine with commas (`pricing,capabilities`):
 *   - `pricing`      → `pricing` (the rate card)
 *   - `capabilities` → `capabilities`
 *   - `modalities`   → `modalities`
 *   - `providers`    → `providers`
 *   - `all`          → every one of the above
 * An unrecognized name is IGNORED rather than refused — the gateway answers
 * 200 with no extra fields — so the mirror is a closed list here: a typo would
 * otherwise succeed silently and return less than asked for.
 */
const EXPANSION = "(?:pricing|capabilities|modalities|providers|all)";

export const zModelsQueryParams = z.object({
    include: z.string()
        .regex(new RegExp(`^${EXPANSION}(?:,${EXPANSION})*$`))
        .optional()
        .describe(
            "Comma-separated row expansions: pricing, capabilities, " +
                "modalities, providers, or all.",
        ),
});
