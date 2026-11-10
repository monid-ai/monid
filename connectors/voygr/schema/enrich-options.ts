import { z } from "zod";

/**
 * What voygr#enrich and voygr#enrich-batch share, as zod shapes each
 * endpoint's schema/inputs.ts composes into its own strict object: the
 * place's identity fields, and the attributes and checks asked of a place.
 */

/**
 * One research field. The name picks the field; the rest tell VOYGR what you
 * mean by it. `include` is for `owners` and `key_people` only.
 */
const zFieldSpec = z.strictObject({
    name: z.string().min(1).max(100).describe(
        "The field's name, for example `wheelchair_accessible`. `owners` " +
            "returns the individual owners or franchisees (name and role); " +
            "`owner_org` returns the operating company when there is no " +
            "individual owner, and a place never gets both. " +
            "`key_people` returns leadership beyond the owner (name and title).",
    ),
    description: z.string().max(500).describe(
        "What you mean by the field, in plain words. VOYGR reads it as " +
            "data and does not follow instructions in it.",
    ).optional(),
    value_type: z.string().describe(
        "A hint for the answer's type: bool, enum, string or number.",
    ).optional(),
    allowed_values: z.array(z.string()).describe(
        "For an enum field, the values it may take.",
    ).optional(),
    include: z.array(z.enum(["phone", "email", "linkedin"])).max(3)
        .describe(
            "`owners` and `key_people` only: look up each person's phone, " +
                "email or LinkedIn. Each costs 1 more credit.",
        ).optional(),
});

/** The fields that say which place a row is. */
export const zPlaceFields = {
    id: z.string().max(100).describe(
        "Your own identifier for the place, echoed back in the answer.",
    ).optional(),
    poi_name: z.string().min(1).max(200).describe("The place's name."),
    address: z.string().max(500).describe(
        "The address as one string. Send this or the parts below.",
    ).optional(),
    street: z.string().describe("Street address.").optional(),
    city: z.string().describe("City.").optional(),
    region: z.string().describe("State or province.").optional(),
    postcode: z.string().describe("Postal or ZIP code.").optional(),
    country: z.string().describe(
        "2-letter ISO country code, for example US.",
    ).optional(),
    latitude: z.number().min(-90).max(90).describe(
        "Latitude in decimal degrees (WGS84).",
    ).optional(),
    longitude: z.number().min(-180).max(180).describe(
        "Longitude in decimal degrees (WGS84).",
    ).optional(),
    registered_address: z.string().max(500).describe(
        "The place's registered (legal) address, if you have one. " +
            "`address` stays the trading address.",
    ).optional(),
};

/** What to research about a place, and the checks to run first. */
export const zEnrichOptions = {
    attributes: z.array(z.union([z.string(), zFieldSpec])).min(1).max(20)
        .describe(
            "What to return, 1 to 20 items. Standard attributes " +
                "(opening_hours, phone, website, facebook, instagram, tiktok, " +
                "x, email, existence, open_closed) cost 1 credit per place " +
                "however many you ask for. Any other name is a research " +
                "field, answered by a bounded research loop and billed at 1 " +
                "credit per field. A request may mix both and pays for each. " +
                "`owners` and `key_people` cost 2, plus 1 for each contact " +
                "in `include`. Leave it out for the standard set.",
        ).optional(),
    include_summary: z.boolean().describe(
        "Also return a short factual `place_summary`. It costs nothing " +
            "extra.",
    ).optional(),
    validate_existence: z.boolean().describe(
        "Also check that the place exists, returned as an `existence` " +
            "attribute.",
    ).optional(),
    verify_name: z.boolean().describe(
        "Confirm the business's name first, and research every " +
            "attribute against it. 1 credit per place, shared with " +
            "`verify_address`: both together still cost 1.",
    ).optional(),
    verify_address: z.boolean().describe(
        "Check the trading address you sent; it is never replaced. 1 credit " +
            "per place, shared with `verify_name`.",
    ).optional(),
    verify_registered_address: z.boolean().describe(
        "Check the registered address you sent. 1 credit per place, " +
            "separate from the other checks.",
    ).optional(),
};
