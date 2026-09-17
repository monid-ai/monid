import { z } from "zod";
import { zJurisdictionState } from "../../../schema/common.ts";

/** Faithful mirror of `StatuteResolveBatchRequest`. */
export const zStatuteResolveBody = z.object({
    citations: z.array(z.string()).min(1).describe(
        "Bluebook citation strings to resolve, up to 50 per call, e.g. " +
            "`42 U.S.C. 1983` or `Tex. Penal Code 22.01`. Duplicates are " +
            "collapsed and order is preserved, so `results` lines up with " +
            "the de-duplicated input.",
    ),
    state: zJurisdictionState.describe(
        "Resolve every citation WITHIN this jurisdiction. Some state " +
            "citation forms are ambiguous across states, and this settles " +
            "them.",
    ).optional(),
    corpusType: z.enum([
        "CONSTITUTION",
        "REGULATION",
        "STATE",
        "STATE_CONSTITUTION",
        "STATE_RULES",
    ]).describe(
        "Resolve every citation WITHIN this corpus: `STATE` for statutory " +
            "text, `REGULATION` for administrative codes, `STATE_RULES` for " +
            "court rules, `CONSTITUTION` for constitutional text.",
    ).optional(),
});
