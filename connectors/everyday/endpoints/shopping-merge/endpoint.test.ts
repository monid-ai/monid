import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import { loadFixture, testSealedUnit } from "@shared/testing";
import { everydayHarness, oneCallFixture } from "../../test-support.ts";

const fixturesDir = fromFileUrl(
    new URL("../../fixtures/", import.meta.url),
);
const ID = "everyday#shopping-merge";
const liveEnabled = Deno.env.get("EVERYDAY_LIVE") === "1" &&
    (await Deno.permissions.query({
            name: "net",
            host: "everyday.alfie.family",
        })).state === "granted";
const shoppingBody = {
    ingredients: [{
        name: "flour",
        quantity: "5/6",
        unit: "US_cup",
        note: "sifted",
    }],
};
const input: RunInput = { body: shoppingBody };

Deno.test(`${ID} happy: exact fractional quantities and source items survive MCP unwrapping`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-shopping-merge-happy.json`,
    );
    const harness = await everydayHarness(unit, fixture);
    const result = await harness.run(input);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as {
        action: string;
        result: { items: Array<Record<string, unknown>> };
    };
    assertEquals(output.action, "shopping_merge");
    assertEquals(output.result.items[0], {
        name: "flour",
        dimension: "volume",
        quantity: "5/6",
        quantityMixed: "5/6",
        unit: "US_cup",
        constituentCount: 1,
        sourceItems: [{
            quantity: "5/6",
            unit: "US_cup",
            note: "sifted",
        }],
    });
    assertEquals(harness.calls[0].headers["mcp-name"], "everyday_calculate");
    assertEquals(harness.calls[0].body, fixture.calls[0].req.body);
});

Deno.test(`${ID} local schema rejects structural bounds and incompatible target-unit spellings`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-shopping-merge-happy.json`,
    );
    const rejected: Json[] = [
        { ingredients: [] },
        {
            ingredients: [{ name: "flour", quantity: 1, unit: "US_cup" }],
        },
        {
            ingredients: shoppingBody.ingredients,
            targetUnits: { volume: "kg" },
        },
        { ...shoppingBody, name: "timer" },
    ];
    for (const body of rejected) {
        const harness = await everydayHarness(unit, fixture);
        await assertRejects(
            () => harness.run({ body }),
            Error,
            "INVALID_INPUT",
        );
        assertEquals(harness.calls, []);
    }
});

Deno.test(`${ID} upstream rational validation: malformed fraction is an MCP error and remains raw`, async () => {
    const unit = await testSealedUnit(ID);
    const body = {
        jsonrpc: "2.0",
        id: "everyday-shopping-merge",
        result: {
            isError: true,
            content: [{
                type: "text",
                text:
                    "ingredient quantity is invalid: denominator must not be zero",
            }],
        },
    };
    const fixture = oneCallFixture(
        "everyday-shopping-invalid-fraction",
        "Synthetic MCP tool validation error for a malformed rational string that JSON Schema cannot express.",
        body,
    );
    const harness = await everydayHarness(unit, fixture);
    const result = await harness.run({
        body: {
            ingredients: [{
                name: "flour",
                quantity: "1/0",
                unit: "US_cup",
            }],
        },
    });
    assertEquals(result.httpStatus, 422);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, body);
    assertEquals(harness.calls.length, 1);
});

Deno.test(`${ID} workflow consumes the recipe endpoint's actual ingredient projection`, async () => {
    const recipeUnit = await testSealedUnit("everyday#recipe-scale");
    const recipeFixture = await loadFixture(
        `${fixturesDir}synthetic-recipe-scale-happy.json`,
    );
    const recipeHarness = await everydayHarness(recipeUnit, recipeFixture);
    const recipe = await recipeHarness.run({
        body: {
            fromServings: "3",
            toServings: "5",
            ingredients: [{
                name: "flour",
                quantity: "1/2",
                unit: "US_cup",
                note: "sifted",
            }],
            instructions: "Mix gently.\nRest for 10 minutes.",
        },
    });
    const recipeOutput = recipe.output as {
        result: {
            instructions: string;
            ingredients: Array<{
                name: string;
                quantity: string;
                unit: string;
                note?: string;
            }>;
        };
    };
    const projected = recipeOutput.result.ingredients.map((ingredient) => ({
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        ...(ingredient.note === undefined ? {} : { note: ingredient.note }),
    }));

    const shoppingUnit = await testSealedUnit(ID);
    const shoppingFixture = await loadFixture(
        `${fixturesDir}synthetic-shopping-merge-happy.json`,
    );
    const shoppingHarness = await everydayHarness(
        shoppingUnit,
        shoppingFixture,
    );
    const shopping = await shoppingHarness.run({
        body: { ingredients: projected },
    });
    const sent = shoppingHarness.calls[0].body as {
        params: { arguments: { request: { ingredients: unknown } } };
    };
    assertEquals(sent.params.arguments.request.ingredients, projected);
    assertEquals(projected[0].quantity, "5/6");
    assertEquals(
        recipeOutput.result.instructions,
        "Mix gently.\nRest for 10 minutes.",
    );
    assertEquals(
        (shopping.output as {
            result: { items: Array<{ quantity: string }> };
        }).result.items[0].quantity,
        "5/6",
    );
});

Deno.test({
    name: `${ID} live maintenance (explicit EVERYDAY_LIVE=1 opt-in)`,
    ignore: !liveEnabled,
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const harness = await everydayHarness(unit);
        const result = await harness.run(input);
        assertEquals(result.httpStatus, 200, JSON.stringify(result.output));
        const output = result.output as {
            result: { items: Array<{ quantity: string }> };
        };
        assertEquals(output.result.items[0].quantity, "5/6");
        assertEquals(harness.calls[0].headers.authorization, undefined);
    },
});
