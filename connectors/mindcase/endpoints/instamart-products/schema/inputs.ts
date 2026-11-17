import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `instamart/products` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/instamart/products). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zInstamartProductsBody = z.object({
    query: z.string()
        .describe("What to search for (e.g. milk, chocolate).")
        .optional(),
    category: z.enum([
        "Atta, Rice and Dal",
        "Baby Care",
        "Bath and Body",
        "Biscuits and Cakes",
        "Cereals and Breakfast",
        "Chips and Namkeens",
        "Chocolates",
        "Cleaners and Repellents",
        "Cold Drinks and Juices",
        "Dairy, Bread and Eggs",
        "Dry Fruits and Seeds Mix",
        "Electronics and Appliances",
        "Fashion",
        "Feminine Hygiene",
        "Fresh Fruits",
        "Fresh Vegetables",
        "Frozen Food",
        "Hair Care",
        "Health and Pharma",
        "Home and Kitchen",
        "Ice Creams and Frozen Desserts",
        "Makeup",
        "Masalas",
        "Meat and Seafood",
        "Noodles, Pasta, Vermicelli",
        "Oils and Ghee",
        "Paan Corner",
        "Pet Supplies",
        "Puja Store",
        "Sauces and Spreads",
        "Sexual Wellness",
        "Skincare",
        "Sports and Fitness",
        "Sweet Corner",
        "Tea, Coffee and Milk drinks",
        "Toys and Stationery",
    ])
        .describe("Top-level category (e.g. Cold Drinks & Juices).")
        .optional(),
    sub_category: z.string()
        .describe(
            "Sub-category within it (e.g. Soft Drinks). Accepts one of 526 values; list them with GET https://api.mindcase.co/v1/data/instamart/products?expand=options.",
        )
        .optional(),
    brand: z.string()
        .describe(
            "Brand as spelled on Instamart. Pick from the list. The brand's URL slug is accepted too. Accepts one of 4846 values; list them with GET https://api.mindcase.co/v1/data/instamart/products?expand=options.",
        )
        .optional(),
    urls: z.array(z.string())
        .describe("One or more product page URLs (one per line).")
        .optional(),
    store_id: z.string()
        .describe(
            "Dark store - pick a city and pincode first. Accepts one of 1197 values; list them with GET https://api.mindcase.co/v1/data/instamart/products?expand=options.",
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
            "City - filters the pincode and store lists. Accepts one of 145 values; list them with GET https://api.mindcase.co/v1/data/instamart/products?expand=options.",
        )
        .optional(),
    pincode: z.string()
        .describe(
            "Pincode - pick a city first; filters the store list. Accepts one of 816 values; list them with GET https://api.mindcase.co/v1/data/instamart/products?expand=options.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe("How many products to return. Use 0 for all.")
        .optional(),
}).strict();
