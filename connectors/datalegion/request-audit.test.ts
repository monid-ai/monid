import { assertEquals, assertRejects } from "@std/assert";
import {
    credentialEnvVarFor,
    directTransport,
    Engine,
} from "@monid/connector-engine";
import type { Json } from "@shared/core";
import { testSealedUnit } from "@shared/testing";

// Verify each access variant against a distinct synthetic credential.
const cases = [
    [
        "person/enrich/base-no-pii",
        "personBaseNoPiiApiKey",
        "PERSON_BASE_NO_PII",
        0.013,
    ],
    ["person/enrich/base-pii", "personBasePiiApiKey", "PERSON_BASE_PII", 0.065],
    [
        "person/enrich/premium-no-pii",
        "personPremiumNoPiiApiKey",
        "PERSON_PREMIUM_NO_PII",
        0.052,
    ],
    [
        "person/enrich/premium-pii",
        "personPremiumPiiApiKey",
        "PERSON_PREMIUM_PII",
        0.104,
    ],
    ["company/enrich/base", "companyBaseApiKey", "COMPANY_BASE", 0.013],
    [
        "company/enrich/premium",
        "companyPremiumApiKey",
        "COMPANY_PREMIUM",
        0.052,
    ],
] as const;

// Seed process-local credentials only when this isolated audit is requested.
const enabled = Deno.args.includes("--isolated-request-audit");
if (enabled) {
    for (const [, , suffix] of cases) {
        Deno.env.set(
            `DATALEGION_CREDENTIALS_${suffix}_API_KEY`,
            `offline-only-${suffix}`,
        );
    }
    Deno.env.set(
        "DATALEGION_CREDENTIALS_API_KEY",
        "offline-legacy-must-not-be-used",
    );
    Deno.env.set("DATALEGION_API_KEY", "offline-alias-must-not-be-used");
}

for (const [path, field, suffix, rate] of cases) {
    Deno.test({
        name:
            `Data Legion request audit: ${suffix}, six distinct env keys, exact serialized request`,
        ignore: !enabled,
        fn: async () => {
            const unit = await testSealedUnit(`datalegion#${path}`);
            const variable = `DATALEGION_CREDENTIALS_${suffix}_API_KEY`;
            assertEquals(credentialEnvVarFor("datalegion", field), variable);
            assertEquals(
                Object.keys(unit.doc.auth.credentials.properties ?? {}),
                [
                    field,
                ],
            );
            const person = path.startsWith("person/");
            const url = `https://api.datalegion.ai/${
                person ? "person" : "company"
            }/enrich`;
            const body: Json = person
                ? { full_name: "Satya Nadella", company: "Microsoft", limit: 1 }
                : { domain: "microsoft.com", limit: 1 };

            for (const shape of ["matched", "empty", "html403"] as const) {
                let sent = 0;
                const loaded = await new Engine({
                    transport: directTransport({
                        // Exercise the default credential resolver with a stubbed network boundary.
                        fetch: async (target, init) => {
                            sent++;
                            assertEquals(String(target), url);
                            assertEquals(init?.redirect, "manual");
                            const request = new Request(target, init);
                            assertEquals(request.method, "POST");
                            assertEquals(
                                request.headers.get("API-Key"),
                                `offline-only-${suffix}`,
                            );
                            assertEquals(
                                request.headers.get("Content-Type"),
                                "application/json",
                            );
                            assertEquals(
                                request.headers.get("Authorization"),
                                null,
                            );
                            assertEquals(
                                request.headers.has("X-Api-Key"),
                                false,
                            );
                            assertEquals(await request.json(), body);
                            if (shape === "html403") {
                                return new Response(
                                    "<html>403 Forbidden</html>",
                                    {
                                        status: 403,
                                        headers: {
                                            "content-type": "text/html",
                                            server: "awselb/2.0",
                                        },
                                    },
                                );
                            }
                            return Response.json({
                                matches: shape === "matched" ? [{}, {}] : [],
                                total: 999,
                            });
                        },
                    }),
                }).load(unit);
                const result = await loaded.run({ body });
                assertEquals(sent, 1);
                assertEquals(
                    result.httpStatus,
                    shape === "html403" ? 403 : 200,
                );
                assertEquals(
                    result.usage.credits,
                    shape === "matched" ? { default: rate } : {},
                );
                if (shape === "html403") {
                    assertEquals(result.output, "<html>403 Forbidden</html>");
                }
            }

            // A missing variant credential must fail before dispatch, without fallback.
            Deno.env.delete(variable);
            try {
                const loaded = await new Engine({
                    transport: directTransport({
                        fetch: () => {
                            throw new Error("MUST NOT SEND REQUEST");
                        },
                    }),
                }).load(unit);
                await assertRejects(
                    () => loaded.run({ body }),
                    Error,
                    "MISSING_CREDENTIAL",
                );
            } finally {
                Deno.env.set(variable, `offline-only-${suffix}`);
            }
        },
    });
}
