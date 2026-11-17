import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `flipkart-minutes/products` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/flipkart-minutes/products). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zFlipkartMinutesProductsBody = z.object({
    query: z.string()
        .describe("What to search for (e.g. milk, chocolate).")
        .optional(),
    category: z.enum([
        "Antiseptics",
        "Asgard SnB HyperLocal 3.0 (0056)",
        "Asgard SnB HyperLocal 3.0 (0065)",
        "Atta Rice Dal",
        "Bakery Biscuits",
        "Batteries",
        "Bedsheets",
        "Breads And Buns",
        "Chips",
        "Cleaning Essentials",
        "Coffee Powder",
        "Condoms",
        "Dhoop Cones",
        "Diaper & Potty Training",
        "Edible Oil",
        "Electronics and Gadgets",
        "Food Products",
        "Fresh Fruit",
        "Fresh Vegetables",
        "General Toys",
        "Hair Care",
        "IceCream Desserts",
        "Kitchen Tools",
        "Lips",
        "Lunch Boxes",
        "Mixed Dry Fruits",
        "Mobiles",
        "Packaged Sweets",
        "Pens & Stationery",
        "Perfume",
        "PetCare",
        "Rolling Machines",
        "Sanitary Pad",
        "Sauce And Dip",
        "Soft Drink Products",
        "Speakers and Earphones",
        "Sports and Fitness",
        "Wrist Watches",
        "hloc/2001",
    ])
        .describe("Top-level category (e.g. Antiseptics).")
        .optional(),
    sub_category: z.string()
        .describe(
            "Sub-category within it (e.g. Adult Diapers). Accepts one of 451 values; list them with GET https://api.mindcase.co/v1/data/flipkart-minutes/products?expand=options.",
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
            "City - filters the pincode list. Accepts one of 384 values; list them with GET https://api.mindcase.co/v1/data/flipkart-minutes/products?expand=options.",
        )
        .optional(),
    pincode: z.string()
        .describe(
            "Pincode - pick a city first. Accepts one of 1927 values; list them with GET https://api.mindcase.co/v1/data/flipkart-minutes/products?expand=options.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe("How many products to return. Use 0 for all.")
        .optional(),
}).strict();
