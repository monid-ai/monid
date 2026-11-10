/**
 * What `POST /v1/enrich` bills for one flat place, as VOYGR's API quotes it
 * with `estimate_only`, then settled against the answer.
 *
 * FROM THE REQUEST (the pre-run estimate, and the settle's ceiling):
 *   - 1 credit if any STANDARD attribute is asked, however many (no
 *     `attributes` means the whole standard set)
 *   - plus 1 per RESEARCH field (any other name)
 *   - `owners` and `key_people` are research fields worth 2, plus 1 for each
 *     distinct contact in `include` (phone, email, linkedin)
 *   - plus 1 if `verify_name` or `verify_address` is set (they share one
 *     lookup)
 *   - plus 1 if `verify_registered_address` is set
 *
 * A name is repeated when it matches an earlier one, and the first
 * occurrence wins: standard names fold case, research names keep it.
 * `validate_existence` and `include_summary` add no credit. The API answers
 * `estimate_only` requests with the same count; `enrich-cost.test.ts` pins
 * each rule to a live answer.
 *
 * FROM THE ANSWER (the settle only; the pre-run estimate has no `output`):
 *   - the request also asks for a research field or a check, and no
 *     standard attribute it asked for came back: VOYGR refunds the standard
 *     lane, so that 1 is dropped. A standard attribute "came back" when its
 *     `attributes` cell has a value. `existence` and `open_closed` are not
 *     in `attributes`: they share one status lane, which came back when the
 *     top-level `status` block has a non-null `existence_confidence` or
 *     `closure_confidence` (as VOYGR's settle reads it)
 *   - a STANDARD-ONLY request keeps its credit on any 200, found or not
 *   - `meta.stopped_reason` is `agent_unavailable`: the research runtime was
 *     down, the research fields answer as abstentions and the standard lane
 *     still runs. VOYGR then settles the standard lane alone, so the
 *     research fields and the checks count 0 (the standard credit is
 *     decided by the rule above, as the request did ask for research)
 * The rules were read live on 2026-10-27 from `GET /v1/usage` deltas and
 * checked against VOYGR's settle. What stays unknown is a research run
 * stopped by a cost cap, which VOYGR may charge less for.
 *
 * The answer carries no credit count, so the settle is this fold (the engine
 * zero-bills every non-2xx). A name close to a standard one
 * ("openning_hours") is refused by the API with a 400, which bills nothing,
 * so it needs no rule here.
 *
 * CLOSED TERM: no imports, no captures, no helpers outside the body. The
 * compiler hashes the source, so estimate and evidence (and any other endpoint
 * that settles on the same rules) share ONE fn only when they reference this
 * very const. A second copy of the rules would be a second thing to keep in
 * step with the API.
 */
export interface EnrichCostBody {
    attributes?: (string | {
        name: string;
        include?: string[];
        [other: string]: unknown;
    })[];
    verify_name?: boolean;
    verify_address?: boolean;
    verify_registered_address?: boolean;
    [other: string]: unknown;
}

export const enrichCredits = (
    { data }: { data: { input: { body: EnrichCostBody }; output?: unknown } },
) => {
    const body = data.input.body;
    const standard = [
        "opening_hours",
        "phone",
        "website",
        "facebook",
        "instagram",
        "tiktok",
        "x",
        "email",
        "existence",
        "open_closed",
    ];
    const contacts = ["phone", "email", "linkedin"];
    const attributes = body.attributes ?? [];
    // the standard attributes asked for, by canonical name
    const wanted: string[] = attributes.length === 0
        ? ["opening_hours", "phone", "website", "existence", "open_closed"]
        : [];
    let research = 0;
    const seen: string[] = [];
    for (const item of attributes) {
        const raw = typeof item === "string" ? item : item.name;
        const name = raw.trim();
        const isStandard = standard.includes(name.toLowerCase());
        const key = isStandard ? name.toLowerCase() : name;
        if (seen.includes(key)) continue;
        seen.push(key);
        if (isStandard) {
            wanted.push(key);
        } else if (raw === "owners" || raw === "key_people") {
            const include = typeof item === "string" ? [] : item.include ?? [];
            research += 2 + contacts.filter((c) => include.includes(c)).length;
        } else {
            research += 1;
        }
    }
    let checks =
        (body.verify_name === true || body.verify_address === true ? 1 : 0) +
        (body.verify_registered_address === true ? 1 : 0);
    let standardCredit = wanted.length > 0 ? 1 : 0;

    const out = data.output as
        | {
            attributes?: Record<string, { value?: unknown } | null> | null;
            status?: {
                existence_confidence?: unknown;
                closure_confidence?: unknown;
            } | null;
            meta?: { stopped_reason?: unknown } | null;
        }
        | null
        | undefined;
    if (out !== null && typeof out === "object" && !Array.isArray(out)) {
        if (standardCredit === 1 && (research > 0 || checks > 0)) {
            const cells = out.attributes ?? {};
            const statusBack = out.status != null &&
                (out.status.existence_confidence != null ||
                    out.status.closure_confidence != null);
            const found = wanted.some((name) =>
                name === "existence" || name === "open_closed"
                    ? statusBack
                    : cells[name]?.value != null
            );
            if (!found) standardCredit = 0;
        }
        if (out.meta?.stopped_reason === "agent_unavailable") {
            research = 0;
            checks = 0;
        }
    }
    return { counts: { CREDIT: standardCredit + research + checks } };
};

/** The credits for one flat place: `enrichCredits` on a bare body. */
export const enrichRowCredits = (body: EnrichCostBody): number =>
    enrichCredits({ data: { input: { body } } }).counts.CREDIT;

/**
 * What `voygr#enrich-batch` bills: one row's price, times the places (the
 * estimate) or the rows that succeeded (the settle, from the job's
 * `progress.succeeded`; no count reads as 0). Every row carries the same
 * options, so every row has the same price.
 *
 * The row's price is the REQUEST side of `enrichCredits` above, copied
 * because a closed term cannot call it: enrich-cost.test.ts runs every
 * priced shape through both. The answer side does not apply: a job's
 * status does not say which rows VOYGR charged less, so each succeeded row
 * counts at its full price.
 */
export const enrichBatchCredits = (
    { data }: {
        data: {
            input: { body: EnrichCostBody & { places: unknown[] } };
            output?: unknown;
        };
    },
) => {
    const body = data.input.body;
    const standard = [
        "opening_hours",
        "phone",
        "website",
        "facebook",
        "instagram",
        "tiktok",
        "x",
        "email",
        "existence",
        "open_closed",
    ];
    const contacts = ["phone", "email", "linkedin"];
    const attributes = body.attributes ?? [];
    let standardCredit = attributes.length === 0 ? 1 : 0;
    let research = 0;
    const seen: string[] = [];
    for (const item of attributes) {
        const raw = typeof item === "string" ? item : item.name;
        const name = raw.trim();
        const isStandard = standard.includes(name.toLowerCase());
        const key = isStandard ? name.toLowerCase() : name;
        if (seen.includes(key)) continue;
        seen.push(key);
        if (isStandard) {
            standardCredit = 1;
        } else if (raw === "owners" || raw === "key_people") {
            const include = typeof item === "string" ? [] : item.include ?? [];
            research += 2 + contacts.filter((c) => include.includes(c)).length;
        } else {
            research += 1;
        }
    }
    const checks =
        (body.verify_name === true || body.verify_address === true ? 1 : 0) +
        (body.verify_registered_address === true ? 1 : 0);
    const row = standardCredit + research + checks;

    if (data.output === undefined) {
        return { counts: { CREDIT: body.places.length * row } };
    }
    const succeeded = (data.output as {
        progress?: { succeeded?: unknown } | null;
    } | null)?.progress?.succeeded;
    return {
        counts: {
            CREDIT: (typeof succeeded === "number" ? succeeded : 0) * row,
        },
    };
};
