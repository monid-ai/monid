import { assertEquals } from "@std/assert";
import { fixture, liveTest, PAGE, replayTask } from "../../testing.ts";

const DEMO_PAGE = {
    websiteURL: "https://demo.turnstile.workers.dev/",
    websiteKey: "1x00000000000000000000AA",
};

Deno.test("capsolver#solve/turnstile: synthetic demo task completes without invented metadata", async () => {
    const input = DEMO_PAGE;
    const recording = await fixture("synthetic-turnstile-demo-succeeded");
    const result = await replayTask("turnstile", input, {
        type: "AntiTurnstileTaskProxyLess",
        ...input,
    }, recording);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.output, recording.calls.at(-1)!.res.body);
    assertEquals(result.usage, {
        credits: { default: 0.0012 },
        evidence: { CALL: 1 },
    });
});

Deno.test("capsolver#solve/turnstile: synthetic demo polling failure costs zero", async () => {
    const input = DEMO_PAGE;
    const recording = await fixture("synthetic-turnstile-demo-rejected");
    const result = await replayTask("turnstile", input, {
        type: "AntiTurnstileTaskProxyLess",
        ...input,
    }, recording);
    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        message: "Captcha solve failed",
        code: "ERROR_CAPTCHA_SOLVE_FAILED",
        raw: recording.calls.at(-1)!.res.body,
    });
});

const metadataCases: Record<string, string>[] = [
    { action: "login" },
    { cdata: "page-context" },
    { action: "login", cdata: "page-context" },
];
for (const metadata of metadataCases) {
    Deno.test(`capsolver#solve/turnstile: maps ${Object.keys(metadata).join(" and ")} into metadata`, async () => {
        const result = await replayTask("turnstile", { ...PAGE, ...metadata }, {
            type: "AntiTurnstileTaskProxyLess",
            ...PAGE,
            metadata,
        }, await fixture("synthetic-turnstile-succeeded"));
        assertEquals(result.isProviderError, false);
    });
}

// The public demo uses a dummy key; offline fixtures simulate provider replies.
// Live solver checks require a non-dummy demo widget, configured explicitly.
const websiteURL = Deno.env.get("CAPSOLVER_TEST_TURNSTILE_WEBSITE_URL");
const websiteKey = Deno.env.get("CAPSOLVER_TEST_TURNSTILE_WEBSITE_KEY");
const action = Deno.env.get("CAPSOLVER_TEST_TURNSTILE_ACTION");
const cdata = Deno.env.get("CAPSOLVER_TEST_TURNSTILE_CDATA");
liveTest(
    "turnstile",
    websiteURL && websiteKey
        ? {
            body: {
                websiteURL,
                websiteKey,
                ...(action ? { action } : {}),
                ...(cdata ? { cdata } : {}),
            },
        }
        : undefined,
    "token",
);
