import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";
import createRequest from "./endpoints/create-request/endpoint.ts";

const ACCEPTED_FIXTURE = fromFileUrl(
    new URL(
        "./endpoints/create-request/fixtures/synthetic-accepted.json",
        import.meta.url,
    ),
);
const NEEDS_INFORMATION_FIXTURE = fromFileUrl(
    new URL(
        "./endpoints/create-request/fixtures/synthetic-needs-information.json",
        import.meta.url,
    ),
);
const STATUS_FIXTURE = fromFileUrl(
    new URL(
        "./endpoints/request-status/fixtures/synthetic-status.json",
        import.meta.url,
    ),
);
const UNAUTHORIZED_STATUS_FIXTURE = fromFileUrl(
    new URL(
        "./endpoints/request-status/fixtures/synthetic-unauthorized.json",
        import.meta.url,
    ),
);
const NOT_FOUND_STATUS_FIXTURE = fromFileUrl(
    new URL(
        "./endpoints/request-status/fixtures/synthetic-not-found.json",
        import.meta.url,
    ),
);

const validBody = {
    objective: "I need help finding auto insurance.",
    product: "auto",
    state: "CA",
    buyerType: "consumer",
    consent: true,
    consentReference: "consent-record-123",
};

Deno.test("insuron submission preserves the 201 accepted response", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("insuron#requests"),
        input: { body: validBody },
        mode: "replay",
        fixture: await loadFixture(ACCEPTED_FIXTURE),
    });
    assertEquals(result.httpStatus, 201);
    assertEquals(result.isProviderError, false);
    assertEquals(result.output, {
        id: "89f2833d-6f0d-4ae0-8fb2-33b02ca03eb9",
        status: "review_required",
        product: "auto",
        state: "CA",
        mode: "async_review",
        createdAt: "2026-01-01T00:00:00.000Z",
    });
    assertEquals(result.usage.credits, {});
});

Deno.test("insuron submission preserves 200 needs_information without inventing a request", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("insuron#requests"),
        input: { body: validBody },
        mode: "replay",
        fixture: await loadFixture(NEEDS_INFORMATION_FIXTURE),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.output, {
        status: "needs_information",
        missingFields: ["objective"],
    });
});

Deno.test("insuron Idempotency-Key is the stable Monid runId", async () => {
    const start = createRequest.lifecycle?.start;
    assert(start, "submission endpoint must define lifecycle.start");
    let sentHeaders: Record<string, string> | undefined;
    const response = await start({
        data: {
            request: { headers: { Accept: "application/json" } },
            run: { runId: "stable-monid-run-id" },
        },
        utils: {
            request: async (options: { headers: Record<string, string> }) => {
                sentHeaders = options.headers;
                return {
                    status: 201,
                    headers: {},
                    body: { status: "review_required" },
                };
            },
        },
    } as never);
    assertEquals(sentHeaders?.["Idempotency-Key"], "stable-monid-run-id");
    assertEquals(response.kind, "COMPLETED");
    if (response.kind === "COMPLETED") {
        assertEquals(response.httpStatus, 201);
    }
});

Deno.test("insuron status is scoped to public status fields", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(
            "insuron#client/requests/{id}",
        ),
        input: {
            pathParams: { id: "89f2833d-6f0d-4ae0-8fb2-33b02ca03eb9" },
        },
        mode: "replay",
        fixture: await loadFixture(STATUS_FIXTURE),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.output, {
        id: "89f2833d-6f0d-4ae0-8fb2-33b02ca03eb9",
        status: "review_required",
        product: "auto",
        state: "CA",
        mode: "async_review",
        createdAt: "2026-01-01T00:00:00.000Z",
    });
    const output = result.output as Record<string, Json>;
    for (
        const privateField of [
            "context",
            "conversationId",
            "sourceAgent",
            "phone",
            "email",
        ]
    ) {
        assert(!(privateField in output), `${privateField} must be omitted`);
    }
});

Deno.test("insuron submission rejects missing consent and unapproved personal fields", async () => {
    const unit = await testSealedUnit("insuron#requests");
    const missingConsent = { ...validBody, consent: undefined };
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: missingConsent as never },
                mode: "replay",
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    body: {
                        ...validBody,
                        phone: "+15555550100",
                    } as never,
                },
                mode: "replay",
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    body: {
                        ...validBody,
                        consumerName: "Example Consumer",
                    } as never,
                },
                mode: "replay",
            }),
        Error,
        "INVALID_INPUT",
    );
});

Deno.test("insuron status 401 and 404 return no request data", async () => {
    const unit = await testSealedUnit("insuron#client/requests/{id}");
    for (
        const { fixturePath, expectedStatus, expectedBody } of [
            {
                fixturePath: UNAUTHORIZED_STATUS_FIXTURE,
                expectedStatus: 401,
                expectedBody: { error: "invalid_application_credential" },
            },
            {
                fixturePath: NOT_FOUND_STATUS_FIXTURE,
                expectedStatus: 404,
                expectedBody: { error: "not_found_or_not_owned" },
            },
        ]
    ) {
        const result = await runEndpoint({
            unit,
            input: {
                pathParams: { id: "89f2833d-6f0d-4ae0-8fb2-33b02ca03eb9" },
            },
            mode: "replay",
            fixture: await loadFixture(fixturePath),
        });
        assertEquals(result.httpStatus, expectedStatus);
        assertEquals(result.isProviderError, true);
        assertEquals(result.output, expectedBody);
        const output = result.output as Record<string, Json>;
        for (
            const privateField of [
                "id",
                "status",
                "phone",
                "email",
                "conversationId",
                "sourceAgent",
            ]
        ) {
            assert(
                !(privateField in output),
                `${expectedStatus} response must omit ${privateField}`,
            );
        }
    }
});

Deno.test("insuron status requires a UUID path parameter", async () => {
    const unit = await testSealedUnit("insuron#client/requests/{id}");
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { pathParams: { id: "not-a-uuid" } },
                mode: "replay",
            }),
        Error,
        "INVALID_INPUT",
    );
});
