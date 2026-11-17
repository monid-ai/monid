import { z } from "zod";
import { zCurrentResult } from "../../../schema/output.ts";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zOutput = zCurrentResult.extend({
    data: z.looseObject({
        "savedTaxReviews": z.array(z.looseObject({
            "id": z.uuid(),
            "year": z.number().int().min(-9007199254740991).max(
                9007199254740991,
            ),
            "strategy": z.string(),
            "status": z.string(),
            "state": z.string(),
            "evaluationVersion": z.string(),
            "completion": z.string(),
            "followUpRequested": z.boolean(),
            "deadline": z.union([z.iso.date(), z.null()]),
            "calculations": z.looseObject({
                "jurisdiction": z.literal("US federal"),
                "currency": z.literal("USD"),
                "hsa": z.union([
                    z.looseObject({
                        "missing": z.array(z.string()),
                        "ruleVersion": z.string(),
                        "sources": z.array(z.url()),
                        "scope": z.string(),
                        "estimate": z.union([
                            z.looseObject({
                                "annualLimit": z.number(),
                                "contributed": z.number(),
                                "scheduled": z.number(),
                                "remaining": z.number(),
                                "excessRecorded": z.number(),
                                "excessIfScheduled": z.number(),
                            }),
                            z.null(),
                        ]),
                    }),
                    z.null(),
                ]),
                "dependentCare": z.union([
                    z.looseObject({
                        "capacity": z.number(),
                        "ruleVersion": z.string(),
                        "comparisonRuleVersion": z.string(),
                        "sources": z.array(z.url()),
                        "scope": z.string(),
                        "comparison": z.looseObject({
                            "missing": z.array(z.string()),
                            "estimate": z.union([
                                z.looseObject({
                                    "withoutElectionCredit": z.number(),
                                    "withElectionCredit": z.number(),
                                    "incomeTaxReduction": z.number(),
                                    "withElectionTotal": z.number(),
                                    "difference": z.number(),
                                    "election": z.number(),
                                }),
                                z.null(),
                            ]),
                        }),
                    }),
                    z.null(),
                ]),
            }),
            "conflicts": z.array(z.string()),
            "nextAction": z.string(),
            "missingFacts": z.array(z.string()),
            "limitations": z.string(),
            "url": z.url(),
        })).optional(),
        "score": z.number().int().min(0).max(100),
        "changeOver30Days": z.union([
            z.number().int().min(-9007199254740991).max(9007199254740991),
            z.null(),
        ]),
        "profileAnswers": z.record(z.string(), z.json()),
        "householdAnswers": z.record(z.string(), z.json()),
        "items": z.array(z.looseObject({
            "id": z.string(),
            "label": z.string(),
            "section": z.string(),
            "status": z.enum([
                "open",
                "due_again",
                "looks_done_confirm",
                "done",
                "not_applicable",
            ]),
            "why": z.string(),
            "evidence": z.union([z.string(), z.null()]),
            "lostEvidence": z.union([z.string(), z.null()]),
            "notApplicableReason": z.union([z.string(), z.null()]),
            "addsPoints": z.union([z.number(), z.null()]),
            "lastDone": z.union([z.iso.datetime(), z.null()]),
            "assignedTo": z.union([z.string(), z.null()]),
            "link": z.union([z.url(), z.null()]),
        })),
        "pageUrl": z.url(),
    }),
});
