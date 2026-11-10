import { z } from "zod";

export const zKitchenUnit = z.enum([
    "count",
    "mg",
    "g",
    "kg",
    "oz",
    "lb",
    "ml",
    "l",
    "US_tsp",
    "US_tbsp",
    "US_cup",
    "US_fl_oz",
    "US_pint",
    "US_quart",
    "US_gal",
    "Imperial_tsp",
    "Imperial_tbsp",
    "Imperial_fl_oz",
    "Imperial_pint",
    "Imperial_quart",
    "Imperial_gal",
]);

export const zIngredient = z.object({
    name: z.string().min(1).max(200),
    quantity: z.string().min(1).max(64).describe(
        "Exact non-negative quantity written as a decimal, fraction, or " +
            "mixed number, for example '1 1/3'.",
    ),
    unit: zKitchenUnit,
    note: z.string().max(500).optional(),
}).strict();

export const zTargetUnits = z.object({
    mass: z.enum(["mg", "g", "kg", "oz", "lb"]).optional(),
    volume: z.enum([
        "ml",
        "l",
        "US_tsp",
        "US_tbsp",
        "US_cup",
        "US_fl_oz",
        "US_pint",
        "US_quart",
        "US_gal",
        "Imperial_tsp",
        "Imperial_tbsp",
        "Imperial_fl_oz",
        "Imperial_pint",
        "Imperial_quart",
        "Imperial_gal",
    ]).optional(),
    count: z.literal("count").optional(),
}).strict();

const zCanonicalQuantity = z.string().max(2500).regex(
    /^(?:0|[1-9]\d*)(?:\/[1-9]\d*)?$/,
);
const zMixedQuantity = z.string().max(2500).regex(
    /^(?:0|[1-9]\d*)(?: [1-9]\d*\/[1-9]\d*)?|[1-9]\d*\/[1-9]\d*$/,
);
const zOutputText = z.string().max(1024 * 1024);

const zRecipeIngredient = z.object({
    name: z.string(),
    quantity: zCanonicalQuantity,
    quantityMixed: zMixedQuantity,
    unit: zKitchenUnit,
    note: z.string().optional(),
}).strict();

export const zRecipeScaleOutput = z.object({
    action: z.literal("recipe_scale"),
    result: z.object({
        text: zOutputText,
        fromServings: zCanonicalQuantity,
        toServings: zCanonicalQuantity,
        scaleFactor: zCanonicalQuantity,
        ingredients: z.array(zRecipeIngredient).max(200),
        instructions: z.string().optional(),
        source: z.literal(
            "Exact rational arithmetic over the user-provided serving counts and ingredient quantities.",
        ),
        limitations: z.literal(
            "Only ingredient quantities are scaled. Notes and instructions are preserved verbatim; cooking times, temperatures, pan sizes, and technique are not interpreted or changed.",
        ),
    }).strict(),
}).strict();

const zSourceItem = z.object({
    quantity: zCanonicalQuantity,
    unit: zKitchenUnit,
    note: z.string().optional(),
}).strict();

const zShoppingItem = z.object({
    name: z.string(),
    dimension: z.enum(["mass", "volume", "count"]),
    quantity: zCanonicalQuantity,
    quantityMixed: zMixedQuantity,
    unit: zKitchenUnit,
    constituentCount: z.number().int().min(1).max(500),
    sourceItems: z.array(zSourceItem).min(1).max(500),
}).strict();

export const zShoppingMergeOutput = z.object({
    action: z.literal("shopping_merge"),
    result: z.object({
        text: zOutputText,
        items: z.array(zShoppingItem).max(500),
        source: z.literal(
            "https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8",
        ),
        limitations: z.literal(
            "Names match only after trimming, collapsing whitespace, Unicode NFC normalization, and English lowercase conversion. Synonyms and plural variants are not matched. Mass, volume, and count remain separate, and no ingredient density is guessed.",
        ),
    }).strict(),
}).strict();
