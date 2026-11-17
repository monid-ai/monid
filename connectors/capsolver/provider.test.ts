import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { runEndpoint, testSealedUnit } from "@shared/testing";
import { fixture, PAGE, replayTask } from "./testing.ts";

const endpoints = [
    {
        name: "recaptcha-v2",
        type: "ReCaptchaV2TaskProxyLess",
        family: "recaptcha",
        field: "gRecaptchaResponse",
        rate: 0.0008,
    },
    {
        name: "recaptcha-v3",
        type: "ReCaptchaV3TaskProxyLess",
        family: "recaptcha",
        field: "gRecaptchaResponse",
        rate: 0.001,
    },
    {
        name: "turnstile",
        type: "AntiTurnstileTaskProxyLess",
        family: "turnstile",
        field: "token",
        rate: 0.0012,
    },
];

for (const endpoint of endpoints) {
    const task = { type: endpoint.type, ...PAGE };
    Deno.test(`capsolver ${endpoint.name}: immediate ready preserves extensions and bills once`, async () => {
        const recording = await fixture(
            `synthetic-${endpoint.family}-succeeded`,
        );
        recording.calls[0].res = recording.calls.at(-1)!.res;
        recording.calls = recording.calls.slice(0, 1);
        const result = await replayTask(endpoint.name, PAGE, task, recording);
        assertEquals(result.httpStatus, 200);
        assertEquals(result.isProviderError, false);
        assertEquals(result.output, recording.calls[0].res.body);
        assertEquals(result.usage, {
            credits: { default: endpoint.rate },
            evidence: { CALL: 1 },
        });
    });

    for (const phase of ["start", "poll"]) {
        Deno.test(`capsolver ${endpoint.name}: ${phase} business errors preserve details and cost zero`, async () => {
            const recording = await fixture(`synthetic-${phase}-rejected`);
            const result = await replayTask(
                endpoint.name,
                PAGE,
                task,
                recording,
            );
            assertEquals(result.httpStatus, 422);
            assertEquals(result.isProviderError, true);
            assertEquals(result.usage, { credits: {}, evidence: {} });
            assertEquals(result.output, {
                message: "Synthetic provider rejection",
                code: "ERROR_TASK_NOT_SUPPORTED",
                raw: recording.calls.at(-1)!.res.body,
            });
        });

        Deno.test(`capsolver ${endpoint.name}: ${phase} HTTP errors cost zero`, async () => {
            const recording = await fixture(`synthetic-${phase}-rejected`);
            recording.calls.at(-1)!.res.status = 503;
            const result = await replayTask(
                endpoint.name,
                PAGE,
                task,
                recording,
            );
            assertEquals(result.httpStatus, 503);
            assertEquals(result.isProviderError, true);
            assertEquals(result.usage, { credits: {}, evidence: {} });
        });

        const malformed: Record<string, Json> = {
            "missing errorId": {
                status: "ready",
                solution: { [endpoint.field]: "token" },
            },
            "string errorId": {
                errorId: "0",
                status: "ready",
                solution: { [endpoint.field]: "token" },
            },
            "missing solution": { errorId: 0, status: "ready" },
            "empty token": {
                errorId: 0,
                status: "ready",
                solution: { [endpoint.field]: "" },
            },
            "blank token": {
                errorId: 0,
                status: "ready",
                solution: { [endpoint.field]: " \t" },
            },
            "non-string token": {
                errorId: 0,
                status: "ready",
                solution: { [endpoint.field]: 123 },
            },
            "wrong token family": {
                errorId: 0,
                status: "ready",
                solution: {
                    [
                        endpoint.field === "token"
                            ? "gRecaptchaResponse"
                            : "token"
                    ]: "wrong-token",
                },
            },
        };
        for (const [label, response] of Object.entries(malformed)) {
            Deno.test(`capsolver ${endpoint.name}: ${phase} ${label} cannot bill success`, async () => {
                const recording = await fixture(`synthetic-${phase}-rejected`);
                recording.calls.at(-1)!.res.body = response;
                const result = await replayTask(
                    endpoint.name,
                    PAGE,
                    task,
                    recording,
                );
                assertEquals(result.httpStatus, 502);
                assertEquals(result.isProviderError, true);
                assertEquals(result.usage, { credits: {}, evidence: {} });
            });
        }
    }

    Deno.test(`capsolver ${endpoint.name}: unknown poll status is an error`, async () => {
        const recording = await fixture("synthetic-poll-rejected");
        recording.calls.at(-1)!.res.body = { errorId: 0, status: "unexpected" };
        const result = await replayTask(endpoint.name, PAGE, task, recording);
        assertEquals(result.httpStatus, 502);
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    });

    Deno.test(`capsolver ${endpoint.name}: missing task ID cannot start polling`, async () => {
        const recording = await fixture("synthetic-start-rejected");
        recording.calls[0].res.body = { errorId: 0, status: "idle" };
        await assertRejects(
            () => replayTask(endpoint.name, PAGE, task, recording),
            Error,
            "taskId",
        );
    });

    Deno.test(`capsolver ${endpoint.name}: invalid input fails before any network request`, async () => {
        const unit = await testSealedUnit(`capsolver#solve/${endpoint.name}`);
        for (
            const body of [
                {},
                { ...PAGE, websiteURL: "invalid" },
                { ...PAGE, websiteKey: "" },
                { ...PAGE, clientKey: "caller-credential" },
                { ...PAGE, task: { type: "unsupported" } },
                { ...PAGE, metadata: { action: "login" } },
            ]
        ) {
            const error = await assertRejects(() =>
                runEndpoint({ unit, input: { body }, mode: "replay" })
            );
            assertEquals((error as { code?: string }).code, "INVALID_INPUT");
        }
        assert(unit.doc.auth.credentials);
    });
}
