import { assertEquals } from "@std/assert";
import { fixture, liveTest, PAGE, replayTask } from "../../testing.ts";

const demoInput = {
    websiteURL: "https://www.google.com/recaptcha/api2/demo",
    websiteKey: "6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-",
    pageAction: "action",
};

Deno.test("capsolver#solve/recaptcha-v2: recorded task completes and bills once", async () => {
    const recording = await fixture("recaptcha-v2-succeeded");
    const result = await replayTask("recaptcha-v2", demoInput, {
        type: "ReCaptchaV2TaskProxyLess",
        ...demoInput,
    }, recording);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.output, recording.calls.at(-1)!.res.body);
    assertEquals(result.usage, {
        credits: { default: 0.0008 },
        evidence: { CALL: 1 },
    });
});

Deno.test("capsolver#solve/recaptcha-v2: optional widget fields are forwarded unchanged", async () => {
    const input = {
        ...PAGE,
        isInvisible: true,
        pageAction: "checkout",
        recaptchaDataSValue: "page-s-value",
        isSession: true,
        apiDomain: "www.recaptcha.net",
    };
    const result = await replayTask("recaptcha-v2", input, {
        type: "ReCaptchaV2TaskProxyLess",
        ...input,
    }, await fixture("synthetic-recaptcha-succeeded"));
    assertEquals(result.isProviderError, false);
});

liveTest("recaptcha-v2", { body: demoInput }, "gRecaptchaResponse");
