import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zRevealBody } from "./schema/inputs.ts";

/** POST /multi-domain-search/reveal — unlock addresses by handle. */
export default defineEndpoint({
    meta: {
        displayName: "Reveal Email Addresses",
        summary:
            "Unlock the email addresses behind multi-domain search reveal handles.",
        description: "Reveal the actual email addresses for rows returned " +
            "by /multi-domain-search. Pass up to 100 reveal_handle " +
            "values; returns each revealed address with the person's " +
            "full name, job title, phone number, LinkedIn URL, type, and " +
            "domain, plus a per-handle outcome in meta.handles (revealed " +
            "/ already_revealed / not_found / insufficient_credits). " +
            "Charged per fresh reveal: one credit per personal address, " +
            "one credit per domain for generic addresses (all generic " +
            "rows on a domain unlock together), and rows already revealed " +
            "this billing period are free. Suited as the paid second step " +
            "after surveying with the masked search.",
        docsUrl:
            "https://hunter.io/api-documentation/v2#multi-domain-search-reveal",
        categories: ["people-enrichment"],
        notes: [
            "Billed at Hunter's own per-batch charge (meta.credits_charged, " +
            "authoritative): fresh personal reveals and generic domain " +
            "bundles count; already-revealed rows are free. A batch the " +
            "balance cannot cover is rejected up front (429) before any " +
            "credit is charged.",
        ],
    },
    request: { method: "POST", path: "/multi-domain-search/reveal" },
    input: { schema: { body: zRevealBody } },
    usage: {
        /** 1 credit per fresh personal reveal (a generic-domain bundle is
         *  also 1) — the live docs and v1's drill (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "reveals",
            description:
                "rows freshly revealed (already-revealed rows are free)",
            consumes: { credit: "default", amount: 1 },
        },
        /** Worst case: every handle is a fresh personal address (typed
         *  read of the validated input — design D25). */
        estimate: ({ data }) => ({
            counts: { RESULT: data.input.body.handles.length },
        }),
        /** Rows Hunter says it revealed fresh on this call. The vendor
         *  bundles all generic addresses on a domain into one credit, so
         *  this count is the CROSS-CHECK and the claim below is the
         *  settlement (v1 drill: 3 revealed rows metered 2). */
        evidence: ({ data, utils }) => {
            const rows = utils.json.optionalGet(data.output, "$.data");
            const revealed = Array.isArray(rows)
                ? rows.filter((row) =>
                    typeof row === "object" && row !== null &&
                    !Array.isArray(row) &&
                    (row as { outcome?: unknown }).outcome === "revealed"
                ).length
                : 0;
            return { counts: { RESULT: revealed } };
        },
        /** The vendor's authoritative charge, `meta.credits_charged`, is
         *  the CLAIM (read + strip in one motion; v1 stripped it in
         *  formatOutput and billed off the raw response). Omitted when
         *  absent — a Beta-endpoint shape change then settles the derived
         *  fold, not a silent zero. Per-handle outcomes stay visible. */
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(
                data.output,
                "$.meta.credits_charged",
            );
            return {
                credits: {
                    ...(typeof value === "number" ? { default: value } : {}),
                },
                output: rest,
            };
        },
    },
});
