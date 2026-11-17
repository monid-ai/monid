import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `blinkit/products` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/blinkit/products). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zBlinkitProductsBody = z.object({
    query: z.string()
        .describe("What to search for (e.g. milk, chocolate).")
        .optional(),
    category: z.enum([
        "Atta, Rice & Dal",
        "Baby Care",
        "Bakery & Biscuits",
        "Bath & Body",
        "Beauty & Cosmetics",
        "Chicken, Meat & Fish",
        "Chips & Namkeen",
        "Cleaners & Repellents",
        "Dairy, Bread & Eggs",
        "Drinks & Juices",
        "Dry Fruits & Cereals",
        "Electronics",
        "Feminine Hygiene",
        "Hair",
        "Health & Pharma",
        "Home & Lifestyle",
        "Ice Creams & More",
        "Instant Food",
        "Kitchenware & Appliances",
        "Oil, Ghee & Masala",
        "Paan Corner",
        "Pet Care",
        "Sauces & Spreads",
        "Sexual Wellness",
        "Skin & Face",
        "Stationery & Games",
        "Sweets & Chocolates",
        "Tea, Coffee & Milk Drinks",
        "Vegetables & Fruits",
    ])
        .describe("Top-level category (e.g. Drinks & Juices).")
        .optional(),
    sub_category: z.string()
        .describe(
            "Sub-category within it (e.g. Soft Drinks). Accepts one of 339 values; list them with GET https://api.mindcase.co/v1/data/blinkit/products?expand=options.",
        )
        .optional(),
    brand: z.string()
        .describe(
            "Brand as spelled on Blinkit. Pick from the list. Sub-brands are returned under the parent (Nivea also returns Nivea Men). Accepts one of 7715 values; list them with GET https://api.mindcase.co/v1/data/blinkit/products?expand=options.",
        )
        .optional(),
    urls: z.array(z.string())
        .describe("One or more product page URLs (one per line).")
        .optional(),
    store_id: z.string()
        .describe(
            "Dark store. Pick a city and pincode first. Accepts one of 2492 values; list them with GET https://api.mindcase.co/v1/data/blinkit/products?expand=options.",
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
            "City - filters the pincode and store lists. Accepts one of 368 values; list them with GET https://api.mindcase.co/v1/data/blinkit/products?expand=options.",
        )
        .optional(),
    pincode: z.string()
        .describe(
            "Pincode - pick a city first; filters the store list. Accepts one of 1530 values; list them with GET https://api.mindcase.co/v1/data/blinkit/products?expand=options.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe("How many products to return. Use 0 for all.")
        .optional(),
}).strict();
