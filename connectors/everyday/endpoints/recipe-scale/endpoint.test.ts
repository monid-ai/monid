import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import { loadFixture, testSealedUnit } from "@shared/testing";
import { everydayHarness, oneCallFixture } from "../../test-support.ts";

const fixturesDir = fromFileUrl(
    new URL("../../fixtures/", import.meta.url),
);
const ID = "everyday#recipe-scale";
const liveEnabled = Deno.env.get("EVERYDAY_LIVE") === "1" &&
    (await Deno.permissions.query({
            name: "net",
            host: "everyday.alfie.family",
        })).state === "granted";
const instructions = "Mix gently.\nRest for 10 minutes.";
const recipeBody = {
    fromServings: "3",
    toServings: "5",
    ingredients: [{
        name: "flour",
        quantity: "1/2",
        unit: "US_cup",
        note: "sifted",
    }],
    instructions,
};
const input: RunInput = { body: recipeBody };

Deno.test(`${ID} happy: exact fractions, notes, and instructions survive MCP unwrapping losslessly`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-recipe-scale-happy.json`,
    );
    const harness = await everydayHarness(unit, fixture);
    const result = await harness.run(input);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as {
        action: string;
        result: {
            scaleFactor: string;
            instructions: string;
            ingredients: Array<Record<string, unknown>>;
        };
    };
    assertEquals(output.action, "recipe_scale");
    assertEquals(output.result.scaleFactor, "5/3");
    assertEquals(output.result.instructions, instructions);
    assertEquals(output.result.ingredients, [{
        name: "flour",
        quantity: "5/6",
        quantityMixed: "5/6",
        unit: "US_cup",
        note: "sifted",
    }]);
    assertEquals(harness.calls[0].headers["mcp-name"], "everyday_calculate");
    assertEquals(harness.calls[0].body, fixture.calls[0].req.body);
    assertEquals(harness.calls[0].headers.authorization, undefined);
});

Deno.test(`${ID} local schema rejects structural bounds before the wire`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-recipe-scale-happy.json`,
    );
    const rejected: Json[] = [
        { fromServings: "3", toServings: "5", ingredients: [] },
        {
            fromServings: "3",
            toServings: "5",
            ingredients: [{ name: "flour", quantity: 0.5, unit: "US_cup" }],
        },
        {
            fromServings: "3",
            toServings: "5",
            ingredients: [{
                name: "flour",
                quantity: "1/2",
                unit: "US_cup",
                note: "x".repeat(501),
            }],
        },
        { ...recipeBody, action: "shopping_merge" },
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

Deno.test(`${ID} upstream rational validation: zero serving count is an MCP error and remains raw`, async () => {
    const unit = await testSealedUnit(ID);
    const body = {
        jsonrpc: "2.0",
        id: "everyday-recipe-scale",
        result: {
            isError: true,
            content: [{
                type: "text",
                text: "fromServings must be greater than zero",
            }],
        },
    };
    const fixture = oneCallFixture(
        "everyday-recipe-zero-servings",
        "Synthetic MCP tool validation error for a zero serving count that JSON Schema cannot express.",
        body,
    );
    const harness = await everydayHarness(unit, fixture);
    const result = await harness.run({
        body: { ...recipeBody, fromServings: "0" },
    });
    assertEquals(result.httpStatus, 422);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, body);
    assertEquals(harness.calls.length, 1);
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
            result: { ingredients: Array<{ quantity: string }> };
        };
        assertEquals(output.result.ingredients[0].quantity, "5/6");
        assertEquals(harness.calls[0].headers.authorization, undefined);
    },
});
