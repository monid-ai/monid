import { assert, assertEquals } from "@std/assert";
import { type Json } from "@shared/core";
import { testSealedUnit } from "@shared/testing";
import { z } from "zod";
import { zEnrichOptions, zPlaceFields } from "./enrich-options.ts";

const zPlace = z.strictObject(zPlaceFields);
const zOptions = z.strictObject(zEnrichOptions);

const accepts = (schema: z.ZodType, value: unknown) =>
    schema.safeParse(value).success;

Deno.test("enrich-options: the place fields are the eleven that say which place a row is", () => {
    assertEquals(Object.keys(zPlaceFields), [
        "id",
        "poi_name",
        "address",
        "street",
        "city",
        "region",
        "postcode",
        "country",
        "latitude",
        "longitude",
        "registered_address",
    ]);
});

Deno.test("enrich-options: the options are the six attributes and checks", () => {
    assertEquals(Object.keys(zEnrichOptions), [
        "attributes",
        "include_summary",
        "validate_existence",
        "verify_name",
        "verify_address",
        "verify_registered_address",
    ]);
});

Deno.test("enrich-options: no field is in both shapes, and neither holds a single-request or batch-only field", () => {
    const place = Object.keys(zPlaceFields);
    const options = Object.keys(zEnrichOptions);
    assertEquals(place.filter((k) => options.includes(k)), []);
    for (const key of ["max_credits", "places"]) {
        assert(!place.includes(key) && !options.includes(key), key);
    }
});

Deno.test("enrich-options: a place needs only a name", () => {
    assert(accepts(zPlace, { poi_name: "Tartine Bakery" }));
    assert(accepts(zPlace, {
        id: "x".repeat(100),
        poi_name: "x".repeat(200),
        address: "x".repeat(500),
        street: "600 Guerrero St",
        city: "San Francisco",
        region: "CA",
        postcode: "94110",
        country: "US",
        latitude: -90,
        longitude: 180,
        registered_address: "x".repeat(500),
    }));
    assert(!accepts(zPlace, {}));
    assert(!accepts(zPlace, { address: "600 Guerrero St" }));
});

Deno.test("enrich-options: place bounds hold", () => {
    const bad: [string, Json][] = [
        ["empty poi_name", { poi_name: "" }],
        ["poi_name over 200", { poi_name: "x".repeat(201) }],
        ["id over 100", { poi_name: "A", id: "x".repeat(101) }],
        ["address over 500", { poi_name: "A", address: "x".repeat(501) }],
        ["registered_address over 500", {
            poi_name: "A",
            registered_address: "x".repeat(501),
        }],
        ["latitude over 90", { poi_name: "A", latitude: 90.1 }],
        ["latitude under -90", { poi_name: "A", latitude: -90.1 }],
        ["longitude over 180", { poi_name: "A", longitude: 180.1 }],
        ["longitude under -180", { poi_name: "A", longitude: -180.1 }],
        ["a typo'd key", { poi_name: "A", adress: "600 Guerrero St" }],
        ["an option on the place", { poi_name: "A", verify_name: true }],
    ];
    for (const [shape, value] of bad) {
        assert(!accepts(zPlace, value), shape);
    }
});

Deno.test("enrich-options: every option is optional", () => {
    assert(accepts(zOptions, {}));
    assert(accepts(zOptions, {
        attributes: ["phone"],
        include_summary: true,
        validate_existence: false,
        verify_name: true,
        verify_address: true,
        verify_registered_address: false,
    }));
});

Deno.test("enrich-options: attributes are 1 to 20 names or field specs", () => {
    assert(accepts(zOptions, { attributes: ["phone"] }));
    assert(accepts(zOptions, {
        attributes: Array.from({ length: 20 }, (_, i) => "f" + i),
    }));
    assert(accepts(zOptions, {
        attributes: [{
            name: "owners",
            description: "x".repeat(500),
            value_type: "string",
            allowed_values: ["a", "b"],
            include: ["phone", "email", "linkedin"],
        }],
    }));
    const bad: [string, Json][] = [
        ["no attributes", { attributes: [] }],
        ["21 attributes", {
            attributes: Array.from({ length: 21 }, (_, i) => "f" + i),
        }],
        ["a number", { attributes: [7] }],
        ["a spec with no name", { attributes: [{ description: "tier" }] }],
        ["a spec with an empty name", { attributes: [{ name: "" }] }],
        ["a spec name over 100", { attributes: [{ name: "x".repeat(101) }] }],
        ["a spec description over 500", {
            attributes: [{ name: "tier", description: "x".repeat(501) }],
        }],
        ["a spec with an unknown key", {
            attributes: [{ name: "tier", kind: "enum" }],
        }],
        ["an unknown include", {
            attributes: [{ name: "owners", include: ["fax"] }],
        }],
        ["four includes", {
            attributes: [{
                name: "owners",
                include: ["phone", "email", "linkedin", "phone"],
            }],
        }],
    ];
    for (const [shape, value] of bad) {
        assert(!accepts(zOptions, value), shape);
    }
});

Deno.test("enrich-options: the checks are booleans", () => {
    for (
        const key of [
            "include_summary",
            "validate_existence",
            "verify_name",
            "verify_address",
            "verify_registered_address",
        ]
    ) {
        assert(accepts(zOptions, { [key]: true }), key);
        assert(!accepts(zOptions, { [key]: "true" }), key);
        assert(!accepts(zOptions, { [key]: 1 }), key);
    }
});

Deno.test("enrich-options: every field keeps its description in the compiled schema", () => {
    // describe goes BEFORE optional, so a binding that unwraps a field
    // keeps it (DEVELOPMENT.md); the compiled schema is where it shows
    for (const shape of [zPlaceFields, zEnrichOptions]) {
        const compiled = z.toJSONSchema(z.strictObject(shape)) as {
            properties: Record<string, { description?: string }>;
        };
        assertEquals(Object.keys(compiled.properties), Object.keys(shape));
        for (const [key, field] of Object.entries(compiled.properties)) {
            assert((field.description ?? "").length > 0, key);
        }
    }
});

// What the two endpoints compile: each composes the SAME shapes, so a
// field means the same thing in voygr#enrich and in a voygr#enrich-batch row.

interface JsonSchema {
    properties: Record<string, Json>;
    required?: string[];
    additionalProperties?: boolean;
}

async function body(id: string): Promise<JsonSchema> {
    const { doc } = await testSealedUnit(id);
    return (doc.input as unknown as { schema: { body: JsonSchema } }).schema
        .body;
}

Deno.test("enrich-options: voygr#enrich and a voygr#enrich-batch row compile the same place fields", async () => {
    const single = await body("voygr#enrich");
    const batch = await body("voygr#enrich-batch");
    const row = (batch.properties.places as unknown as { items: JsonSchema })
        .items;
    assertEquals(Object.keys(row.properties), Object.keys(zPlaceFields));
    for (const key of Object.keys(zPlaceFields)) {
        assert(key in single.properties, key);
        assertEquals(row.properties[key], single.properties[key], key);
    }
    assertEquals(row.required, ["poi_name"]);
    assertEquals(row.additionalProperties, false);
});

Deno.test("enrich-options: voygr#enrich and voygr#enrich-batch compile the same options", async () => {
    const single = await body("voygr#enrich");
    const batch = await body("voygr#enrich-batch");
    for (const key of Object.keys(zEnrichOptions)) {
        assertEquals(batch.properties[key], single.properties[key], key);
    }
    // what each adds: a whole request is capped, a job lists its places
    assertEquals(Object.keys(single.properties).slice(-1), ["max_credits"]);
    assert(!("max_credits" in batch.properties));
    assertEquals(Object.keys(batch.properties).slice(-1), ["places"]);
    assert(!("places" in single.properties));
    // both are strict, and a place stays the only required field
    assertEquals(single.additionalProperties, false);
    assertEquals(batch.additionalProperties, false);
    assertEquals(single.required, ["poi_name"]);
    assertEquals(batch.required, ["places"]);
});
