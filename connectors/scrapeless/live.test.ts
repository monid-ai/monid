import { assertEquals } from "@std/assert";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import type { Json } from "@shared/core";
import { reviewCases } from "./review-cases.ts";

// A configured key alone must not trigger 22 paid submissions. Explicitly
// select ONE endpoint; no .env loading, batches, retries or fixture writes.
const selected = Deno.env.get("SCRAPELESS_LIVE_ENDPOINT");
for (const [path, fixtureName] of reviewCases) {
    const id = "scrapeless#" + path;
    Deno.test({
        name: id +
            " live (explicit single-endpoint opt-in and credentials required)",
        ignore: selected !== id || liveSkip("scrapeless"),
        fn: async () => {
            const fixture = await loadFixture(
                new URL(`./fixtures/${fixtureName}.json`, import.meta.url)
                    .pathname,
            );
            const override = Deno.env.get("SCRAPELESS_LIVE_BODY");
            const body: Json = override === undefined
                ? fixture.calls[0].req.body!
                : JSON.parse(override);
            const result = await runEndpoint({
                unit: await testSealedUnit(id),
                input: { body },
                mode: "live",
            });
            assertEquals(result.isProviderError, false);
            assertEquals(result.httpStatus, 200);
        },
    });
}
