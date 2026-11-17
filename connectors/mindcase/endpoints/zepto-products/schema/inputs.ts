import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `zepto/products` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/zepto/products). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zZeptoProductsBody = z.object({
    query: z.string()
        .describe("What to search for (e.g. milk, chocolate).")
        .optional(),
    category: z.enum([
        "Apparel Lifestyle",
        "Atta Rice Oil Dals",
        "Baby Care",
        "Bath Body",
        "Biscuits",
        "Breakfast Sauces",
        "Cleaning Essentials",
        "Cold Drinks Juices",
        "Dairy Bread Eggs",
        "Electronics Appliances",
        "Feminine Hygiene",
        "Fragrances Grooming",
        "Frozen Food",
        "Fruits Vegetables",
        "Hair Care",
        "Home Needs",
        "Ice Creams More",
        "Jewellery",
        "Kitchen Dining",
        "Makeup Beauty",
        "Masala Dry Fruits More",
        "Meats Fish Eggs",
        "Munchies",
        "Paan Corner",
        "Packaged Food",
        "Pet Care",
        "Pharma Wellness",
        "Protein Nutrition",
        "Sexual Wellness",
        "Skincare",
        "Stationery Books",
        "Sweet Cravings",
        "Tea Coffee More",
        "Toys Sports",
    ])
        .describe("Top-level category (e.g. Cold Drinks & Juices).")
        .optional(),
    sub_category: z.string()
        .describe(
            "Sub-category within it (e.g. Soft Drinks). Accepts one of 428 values; list them with GET https://api.mindcase.co/v1/data/zepto/products?expand=options.",
        )
        .optional(),
    brand: z.string()
        .describe(
            "Brand as spelled on Zepto. Pick from the list. The brand's URL slug is accepted too. Accepts one of 11344 values; list them with GET https://api.mindcase.co/v1/data/zepto/products?expand=options.",
        )
        .optional(),
    urls: z.array(z.string())
        .describe("One or more product page URLs (one per line).")
        .optional(),
    store_id: z.string()
        .describe(
            "Dark store - pick a city and pincode first. Accepts one of 1685 values; list them with GET https://api.mindcase.co/v1/data/zepto/products?expand=options.",
        )
        .optional(),
    lat: z.number().min(-90).max(90)
        .describe("Or target by coordinates: latitude (use with longitude).")
        .optional(),
    lon: z.number().min(-180).max(180)
        .describe("Or target by coordinates: longitude (use with latitude).")
        .optional(),
    city: z.string()
        .describe(
            "City - filters the pincode and store lists. Accepts one of 140 values; list them with GET https://api.mindcase.co/v1/data/zepto/products?expand=options.",
        )
        .optional(),
    pincode: z.string()
        .describe(
            "Pincode - pick a city first; filters the store list. Accepts one of 935 values; list them with GET https://api.mindcase.co/v1/data/zepto/products?expand=options.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe("How many products to return. Use 0 for all.")
        .optional(),
}).strict();
