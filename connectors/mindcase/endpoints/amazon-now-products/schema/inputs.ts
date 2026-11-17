import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `amazon-now/products` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/amazon-now/products). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zAmazonNowProductsBody = z.object({
    query: z.string()
        .describe("What to search for (e.g. milk, chocolate).")
        .optional(),
    category: z.enum([
        "Bath & Body",
        "Biscuits & Cookies",
        "Breakfast Foods",
        "Chicken, Meat & Fish",
        "Chips & Munchies",
        "Chocolates & Ice-cream",
        "Coffee & Tea",
        "Dairy, Bread & Eggs",
        "Drinks & Juices",
        "Electronics",
        "Feminine Hygiene",
        "Fresh Fruits",
        "Fresh Vegetables",
        "Gifting Store",
        "Hair Care",
        "Hardware & Electricals",
        "Home Lifestyle",
        "Household Cleaners",
        "Indian Snacks & Sweets",
        "Kids Zone",
        "Kitchen Utilities",
        "Laundry & Dishcare",
        "Makeup & Beauty",
        "Men’s Grooming",
        "Nutritional Supplements",
        "Oils, Ghee & Masala",
        "Oral Care",
        "PC & Electronics",
        "Paan Store",
        "Party Hub",
        "Pastes & Sauces",
        "Ready To Eat & Cook",
        "Rice, Atta & Dal",
        "Sexual Wellness",
        "Stationery & Books",
        "Style Staples",
        "Tissues & Napkins",
        "Travel Essentials",
        "Vehicle Accessories",
    ])
        .describe("Top-level category (e.g. Dairy, Bread & Eggs).")
        .optional(),
    sub_category: z.string()
        .describe(
            "Sub-category within it (e.g. Butter). Required with a category, since there is no whole-category sweep. Accepts one of 375 values; list them with GET https://api.mindcase.co/v1/data/amazon-now/products?expand=options.",
        )
        .optional(),
    urls: z.array(z.string())
        .describe(
            "One or more Amazon product URLs or bare ASINs (one per line).",
        )
        .optional(),
    city: z.string()
        .describe(
            "City - filters the pincode list. Accepts one of 384 values; list them with GET https://api.mindcase.co/v1/data/amazon-now/products?expand=options.",
        )
        .optional(),
    pincode: z.string()
        .describe(
            "Pincode - pick a city first. Accepts one of 1927 values; list them with GET https://api.mindcase.co/v1/data/amazon-now/products?expand=options.",
        )
        .optional(),
    lat: z.number().min(-90).max(90)
        .describe("Or target by coordinates: latitude (use with longitude).")
        .optional(),
    lon: z.number().min(-180).max(180)
        .describe("Or target by coordinates: longitude (use with latitude).")
        .optional(),
    maxResults: z.number().int()
        .describe("How many products to return. Use 0 for all.")
        .optional(),
}).strict();
