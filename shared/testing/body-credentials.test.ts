import { assert, assertEquals } from "@std/assert";
import type { Json } from "@shared/core";
import {
    type RecordedCall,
    recordingFetch,
    scrubCalls,
    trimCalls,
} from "./fixtures.ts";

const SECRET = "test-only-body-secret";
const BODY: Json = {
    clientKey: SECRET,
    nested: [{ Client_Key: SECRET }, { "CLIENT-KEY": SECRET }],
    task: { type: "ReCaptchaV2TaskProxyLess", websiteKey: "public-site-key" },
    solution: {
        token: "solution-token",
        gRecaptchaResponse: "recaptcha-token",
    },
    count: 2,
    enabled: true,
    optional: null,
};
const REDACTED: Json = {
    clientKey: "REDACTED",
    nested: [{ Client_Key: "REDACTED" }, { "CLIENT-KEY": "REDACTED" }],
    task: { type: "ReCaptchaV2TaskProxyLess", websiteKey: "public-site-key" },
    solution: {
        token: "solution-token",
        gRecaptchaResponse: "recaptcha-token",
    },
    count: 2,
    enabled: true,
    optional: null,
};

Deno.test("recordingFetch: body credentials never enter the sink; live traffic is unchanged", async () => {
    const sink: RecordedCall[] = [];
    const text = JSON.stringify(BODY);
    let sent = 0;
    const recording = recordingFetch((_input, init) => {
        assertEquals(init?.body, text, "live requests retain the credential");
        sent++;
        return Promise.resolve(
            new Response(text, {
                status: 200,
                headers: { "content-type": "application/json" },
            }),
        );
    }, sink);
    for (const path of ["createTask", "getTaskResult"]) {
        const response = await recording(`https://api.capsolver.com/${path}`, {
            method: "POST",
            body: text,
            headers: { authorization: "test-header-secret" },
        });
        assertEquals(
            await response.text(),
            text,
            "live responses retain the original JSON",
        );
    }
    assertEquals(sent, 2);
    for (const call of sink) {
        assertEquals(call.req.body, REDACTED);
        assertEquals(call.res.body, REDACTED);
        assert(!("headers" in call.req));
    }
    assert(
        !JSON.stringify(sink).includes(SECRET),
        "redaction happens without trim or scrub passes",
    );
});

Deno.test("scrubCalls: legacy JSON credentials are recursively redacted without mutation", () => {
    const calls: RecordedCall[] = [{
        req: {
            method: "POST",
            url: "https://api.capsolver.com/createTask",
            body: structuredClone(BODY),
        },
        res: { status: 200, body: structuredClone(BODY) },
    }];
    const before = structuredClone(calls);
    const scrubbed = scrubCalls(calls);
    assertEquals(scrubbed[0].req.body, REDACTED);
    assertEquals(scrubbed[0].res.body, REDACTED);
    assertEquals(calls, before);
    assertEquals(scrubCalls(scrubbed), scrubbed, "scrubbing is idempotent");
    assertEquals(
        scrubCalls(trimCalls(calls)),
        scrubbed,
        "default recording also redacts credentials",
    );
});

Deno.test("recordingFetch: requests without JSON bodies and plain text responses still work", async () => {
    const sink: RecordedCall[] = [];
    const recording = recordingFetch(
        () => Promise.resolve(new Response("plain response")),
        sink,
    );
    const response = await recording("https://api.test/status", {
        method: "GET",
    });
    assertEquals(await response.text(), "plain response");
    assertEquals(sink, [{
        req: { method: "GET", url: "https://api.test/status" },
        res: { status: 200, body: "plain response" },
    }]);
});
