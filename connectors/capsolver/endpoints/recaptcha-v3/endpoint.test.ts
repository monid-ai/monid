import { assertEquals } from "@std/assert";
import { fixture, liveTest, PAGE, replayTask } from "../../testing.ts";

const demoInput = {
    websiteURL:
        "https://recaptcha-demo.appspot.com/recaptcha-v3-request-scores.php",
    websiteKey: "6LdKlZEpAAAAAAOQjzC2v_d36tWxCl6dWsozdSy9",
    pageAction: "examples/v3scores",
};

Deno.test("capsolver#solve/recaptcha-v3: recorded task completes and bills once", async () => {
    const recording = await fixture("recaptcha-v3-succeeded");
    const result = await replayTask("recaptcha-v3", demoInput, {
        type: "ReCaptchaV3TaskProxyLess",
        ...demoInput,
    }, recording);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.output, recording.calls.at(-1)!.res.body);
    assertEquals(result.usage, {
        credits: { default: 0.001 },
        evidence: { CALL: 1 },
    });
});

Deno.test("capsolver#solve/recaptcha-v3: action and session fields reach createTask", async () => {
    const input = {
        ...PAGE,
        pageAction: "login",
        isSession: true,
        apiDomain: "www.recaptcha.net",
    };
    const result = await replayTask("recaptcha-v3", input, {
        type: "ReCaptchaV3TaskProxyLess",
        ...input,
    }, await fixture("synthetic-recaptcha-succeeded"));
    assertEquals(result.isProviderError, false);
});

liveTest("recaptcha-v3", { body: demoInput }, "gRecaptchaResponse");
