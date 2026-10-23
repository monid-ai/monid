import type { Json, RunInput } from "@shared/core";
import { directTransport, Engine } from "@monid/connector-engine";
import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, testSealedUnit } from "@shared/testing";

const fixtureRoot = fromFileUrl(new URL("./fixtures/", import.meta.url));
const endpoints: { name: string; input: RunInput }[] = [
    { name: "get_setup_status", input: { body: {} } },
    {
        name: "get_cash_flow",
        input: { body: { startDate: null, endDate: null } },
    },
    { name: "list_recurring", input: { body: {} } },
];

// Stable denial codes from BetterOff MCP authorization. Fixtures are synthetic;
// these tests verify propagation, not provider-side authorization decisions.
for (const { name, input } of endpoints) {
    Deno.test(`betteroff#${name}: preserves OAuth denials and temporary failures without retrying`, async () => {
        const unit = await testSealedUnit(`betteroff#${name}`);
        for (
            const [fixtureName, code] of [
                ["invalid-token", "AGENT_TOKEN_INVALID"],
                ["forbidden", "AGENT_GRANT_REVOKED"],
                ["forbidden", "AGENT_NOT_OWNER"],
                ["forbidden", "AGENT_AI_CONSENT_REQUIRED"],
                ["forbidden", "AGENT_ACCOUNT_DELETION_PENDING"],
                ["forbidden", "AGENT_ACCESS_DENIED"],
                ["forbidden", "INSUFFICIENT_SCOPE"],
                ["auth-unavailable", "AGENT_AUTHZ_UNAVAILABLE"],
                ["auth-unavailable", "AGENT_AUTH_UNAVAILABLE"],
            ]
        ) {
            const fixture = await loadFixture(
                `${fixtureRoot}synthetic-${fixtureName}.json`,
            );
            const { status } = fixture.calls[0].res;
            const body = fixture.calls[0].res.body as Record<string, Json>;
            if (body.code !== code) {
                body.code = code;
                body.detail =
                    body.error =
                    body.message =
                        `Synthetic ${code} response.`;
            }
            let calls = 0;
            let resolutions = 0;
            const engine = new Engine({
                transport: directTransport({
                    params: async () => {
                        resolutions++;
                        return { accessToken: "synthetic-token" };
                    },
                    fetch: async () => {
                        calls++;
                        return new Response(JSON.stringify(body), { status });
                    },
                }),
            });
            const result = await (await engine.load(unit)).run(input);
            assertEquals(result.isProviderError, true, code);
            assertEquals(result.httpStatus, status, code);
            assertEquals(result.providerHttpStatus, undefined, code);
            assertEquals(result.output, body, code);
            assertEquals((result.output as Record<string, Json>).code, code);
            assertEquals(
                (result.output as Record<string, Json>).data,
                undefined,
            );
            assertEquals(result.usage, { credits: {}, evidence: {} }, code);
            assertEquals(calls, 1, code);
            assertEquals(resolutions, 1, code);
        }
    });
}
