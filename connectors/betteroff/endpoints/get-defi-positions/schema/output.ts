import { z } from "zod";
import { zCurrentResult } from "../../../schema/output.ts";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zOutput = zCurrentResult.extend({
    data: z.looseObject({
        "dataSource": z.enum([
            "canonical_wallet_positions",
            "legacy_holdings_projection",
        ]),
        "totalValueUsd": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$"))
            .describe(
                'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
            ),
        "grossAssetValueUsd": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$"))
            .describe(
                'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
            ),
        "grossLiabilityValueUsd": z.union([
            z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$")).describe(
                'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
            ),
            z.null(),
        ]),
        "netValueUsd": z.union([
            z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$")).describe(
                'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
            ),
            z.null(),
        ]),
        "positionCount": z.number().int().min(0).max(9007199254740991),
        "protocolCount": z.number().int().min(0).max(9007199254740991),
        "protocols": z.array(z.union([
            z.looseObject({
                "protocol": z.string(),
                "chains": z.array(z.string()),
                "positionCount": z.number().int().min(0).max(9007199254740991),
                "grossAssetValueUsd": z.string().regex(
                    new RegExp("^-?\\d+(\\.\\d+)?$"),
                ).describe(
                    'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
                ),
                "grossLiabilityValueUsd": z.string().regex(
                    new RegExp("^-?\\d+(\\.\\d+)?$"),
                ).describe(
                    'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
                ),
                "netValueUsd": z.string().regex(
                    new RegExp("^-?\\d+(\\.\\d+)?$"),
                ).describe(
                    'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
                ),
                "positions": z.array(z.looseObject({
                    "id": z.string(),
                    "name": z.string(),
                    "kind": z.string(),
                    "chain": z.string(),
                    "grossAssetValueUsd": z.string().regex(
                        new RegExp("^-?\\d+(\\.\\d+)?$"),
                    ).describe(
                        'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
                    ),
                    "grossLiabilityValueUsd": z.string().regex(
                        new RegExp("^-?\\d+(\\.\\d+)?$"),
                    ).describe(
                        'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
                    ),
                    "netValueUsd": z.string().regex(
                        new RegExp("^-?\\d+(\\.\\d+)?$"),
                    ).describe(
                        'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
                    ),
                    "inRange": z.union([z.boolean(), z.null()]),
                    "maturesAt": z.union([z.string(), z.null()]),
                    "marketFixedApy": z.union([z.number(), z.null()]),
                    "protocolContext": z.union([
                        z.record(z.string(), z.json()),
                        z.null(),
                    ]),
                    "legs": z.array(z.looseObject({
                        "assetId": z.union([z.string(), z.null()]),
                        "contractAddress": z.union([z.string(), z.null()]),
                        "role": z.string(),
                        "economicSide": z.enum(["asset", "liability"]),
                        "contributesToNetWorth": z.boolean(),
                        "symbol": z.string(),
                        "name": z.string(),
                        "quantity": z.string(),
                        "priceUsd": z.union([
                            z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$"))
                                .describe(
                                    'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
                                ),
                            z.null(),
                        ]),
                        "valueUsd": z.string().regex(
                            new RegExp("^-?\\d+(\\.\\d+)?$"),
                        ).describe(
                            'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
                        ),
                        "verified": z.union([z.boolean(), z.null()]),
                        "valuationKnown": z.union([z.boolean(), z.null()]),
                        "observedValueUsd": z.union([z.string(), z.null()]),
                    })),
                    "risk": z.record(z.string(), z.json()),
                    "provenance": z.looseObject({
                        "provider": z.string(),
                        "providerPositionId": z.string(),
                        "observedAt": z.string(),
                        "observedAtBlock": z.union([z.string(), z.null()]),
                        "completeness": z.string(),
                        "freshness": z.string(),
                        "evidenceRef": z.union([z.string(), z.null()]),
                    }),
                })),
            }),
            z.looseObject({
                "protocol": z.string(),
                "chains": z.array(z.string()),
                "positionCount": z.number().int().min(0).max(9007199254740991),
                "totalValueUsd": z.string().regex(
                    new RegExp("^-?\\d+(\\.\\d+)?$"),
                ).describe(
                    'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
                ),
                "byPositionType": z.array(z.looseObject({
                    "type": z.string(),
                    "count": z.number().int().min(0).max(9007199254740991),
                    "valueUsd": z.string().regex(
                        new RegExp("^-?\\d+(\\.\\d+)?$"),
                    ).describe(
                        'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
                    ),
                })),
                "topAssets": z.array(z.looseObject({
                    "symbol": z.string(),
                    "quantity": z.number(),
                    "valueUsd": z.string().regex(
                        new RegExp("^-?\\d+(\\.\\d+)?$"),
                    ).describe(
                        'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
                    ),
                })),
            }),
        ])),
        "coverage": z.record(z.string(), z.json()),
        "filters": z.record(z.string(), z.json()),
    }),
});
