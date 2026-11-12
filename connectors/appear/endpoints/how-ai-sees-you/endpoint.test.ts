import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const endpointId = "appear#how-ai-sees-you";
const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("Appear returns the recorded scan evidence without inline screenshots or usage charges", async () => {
    const unit = await testSealedUnit(endpointId);
    const fixture = await loadFixture(`${fixturesDir}scan.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { domain: "joinappear.com" } },
        mode: "replay",
        fixture,
    });
    const body = fixture.calls[0].res.body as {
        success: boolean;
        result: { pages: { screenshotDataUrl?: string }[] };
    };
    const expected = structuredClone(body);
    for (const page of expected.result.pages) delete page.screenshotDataUrl;
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.output, expected);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(unit.doc.auth.credentials.required ?? [], []);
});

Deno.test("Appear forwards a rejected scan and charges zero usage", async () => {
    const unit = await testSealedUnit(endpointId);
    const fixture = await loadFixture(`${fixturesDir}invalid-domain.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { domain: "invalid", fresh: true } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 400);
    assertEquals(result.isProviderError, true);
    assertEquals(result.output, fixture.calls[0].res.body);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});
