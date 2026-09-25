import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { RunInput } from "@shared/core";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const HERE = fromFileUrl(new URL("./", import.meta.url));
const INPUTS = JSON.parse(
    await Deno.readTextFile(`${HERE}test-inputs.json`),
) as Record<string, RunInput>;
const ID = "magic-hour#v1/image/magic-hour-ai-gif";

const run = async (name: string) =>
    await runEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUTS["ai-gif-generator"],
        mode: "replay",
        fixture: await loadFixture(`${HERE}fixtures/${name}.json`),
    });

Deno.test("magic-hour: AI GIF completes with a download and settles 50 credits", async () => {
    const result = await run("job-succeeded");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 50 },
        evidence: { CALL: 1 },
    });
    const output = result.output as {
        status: string;
        downloads: Array<{ url: string }>;
    };
    assertEquals(output.status, "complete");
    assertEquals(output.downloads[0].url, "https://example.com/animation.gif");
});

Deno.test("magic-hour: failed image project returns an error with zero usage", async () => {
    const result = await run("job-failed");
    assertEquals(result.httpStatus, 500);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("magic-hour: rejected submission does not poll or bill", async () => {
    const result = await run("start-rejected");
    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("magic-hour: completed project without download is not successful", async () => {
    const result = await run("job-no-download");
    assertEquals(result.httpStatus, 502);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});
