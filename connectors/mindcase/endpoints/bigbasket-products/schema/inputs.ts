import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `bigbasket/products` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/bigbasket/products). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zBigbasketProductsBody = z.object({
    query: z.string()
        .describe("What to search for (e.g. milk, chocolate).")
        .optional(),
    category: z.enum([
        "Atta, rice, dal & more",
        "Baby care",
        "Bakery & batters",
        "Bath, body & oral care",
        "Beauty & cosmetics",
        "Biscuits & cookies",
        "Cleaners & repellents",
        "Dairy",
        "Dry fruits & cereals",
        "Eggs, meat & fish",
        "Electronics",
        "Fashion store",
        "Feminine hygiene",
        "Gift store",
        "Gourmet & world food",
        "Hair care",
        "Health & pharmacy",
        "Home & lifestyle",
        "Kitchenware & appliances",
        "Men's grooming",
        "Namkeen & chips",
        "Oil, ghee & masala",
        "Organic store",
        "Party store",
        "Sexual wellness",
        "Stationery & books",
        "Sweets & chocolates",
        "The daily spread",
        "Toy store",
        "Toys, games & sports",
        "Travel & automotive",
        "Travel store",
    ])
        .describe("Top-level category (e.g. Atta, rice, dal & more).")
        .optional(),
    sub_category: z.string()
        .describe(
            "Sub-category within it (e.g. Aashirvaad). Accepts one of 432 values; list them with GET https://api.mindcase.co/v1/data/bigbasket/products?expand=options.",
        )
        .optional(),
    brand: z.string()
        .describe(
            "Brand - pick from the list. Returns every product that brand sells at the store serving your location. Accepts one of 8446 values; list them with GET https://api.mindcase.co/v1/data/bigbasket/products?expand=options.",
        )
        .optional(),
    urls: z.array(z.string())
        .describe("One or more product page URLs (one per line).")
        .optional(),
    lat: z.number().min(-90).max(90)
        .describe("Or target by coordinates: latitude (use with longitude).")
        .optional(),
    lon: z.number().min(-180).max(180)
        .describe("Or target by coordinates: longitude (use with latitude).")
        .optional(),
    city: z.string()
        .describe(
            "City - filters the pincode list. Accepts one of 384 values; list them with GET https://api.mindcase.co/v1/data/bigbasket/products?expand=options.",
        )
        .optional(),
    pincode: z.string()
        .describe(
            "Pincode - pick a city first. Accepts one of 1927 values; list them with GET https://api.mindcase.co/v1/data/bigbasket/products?expand=options.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe("How many products to return. Use 0 for all.")
        .optional(),
}).strict();
