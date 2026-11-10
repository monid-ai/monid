import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "dansugc#broll/{videoId}";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const CLIP = "7e568b94-329c-4615-a91e-458d2185f83d";

Deno.test(`${ID} happy (recorded): free, the whole clip relays`, async () => {
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { pathParams: { videoId: CLIP } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
    assertEquals((result.output as { video: { id: string } }).video.id, CLIP);
});

Deno.test(`${ID} provider error (synthetic 401): zero usage, error digested`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { pathParams: { videoId: CLIP } },
        mode: "replay",
        fixture: await loadFixture(
            `${fixturesDir}synthetic-provider-error.json`,
        ),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as { message: string }).message,
        "Invalid API key",
    );
});

Deno.test(`${ID}: the schema gate — a clip id is a UUID`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const run = (videoId: string) =>
        runEndpoint({
            unit,
            input: { pathParams: { videoId } },
            mode: "replay",
            fixture,
        });
    // one hex digit short of the recorded id
    await assertRejects(() => run(CLIP.slice(0, -1)), Error, "INVALID_INPUT");
    {
        // the near twin (another valid id) passes the gate and fails later,
        // at replay URL matching — proving validation let it through
        const err = await assertRejects(
            () => run("1166a85d-b967-4fb0-8ed8-6d2f2d22f23b"),
            Error,
        );
        assertEquals(err.message.includes("INVALID_INPUT"), false, err.message);
    }
});

Deno.test({
    name: `${ID} live (gated on DANSUGC_API_KEY)`,
    ignore: liveSkip("dansugc"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { pathParams: { videoId: CLIP } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output).slice(0, 500),
        );
        const video = (result.output as { video: { id: string } }).video;
        assertEquals(video.id, CLIP);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
