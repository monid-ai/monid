import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { type Json, UsageModelKind } from "@shared/core";
import { directTransport, Engine } from "@monid/connector-engine";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixtures = fromFileUrl(new URL("./fixtures/", import.meta.url));
const body = {
    repository: "example/parser",
    commit: "a".repeat(40),
    title: "Fix parser",
    task: "Keep the export order.",
    reward: 25,
    paths: ["src/parser.ts"],
};

for (
    const [shape, status] of [["prepared", 200], ["refused", 400], [
        "limited",
        429,
    ]] as const
) {
    Deno.test(`omakase-box prepare ${shape}: POST passthrough and FREE usage`, async () => {
        const unit = await testSealedUnit("omakase-box#bounties/prepare");
        const fixture = await loadFixture(
            `${fixtures}synthetic-prepare-${shape}.json`,
        );
        const result = await runEndpoint({
            unit,
            input: { body: fixture.calls[0].req.body },
            mode: "replay",
            fixture,
        });
        assertEquals(unit.doc.request, {
            method: "POST",
            url: "https://omakasebox.dev/api/agents/prepare",
        });
        assertEquals(unit.doc.auth.credentials.properties, {});
        assertEquals(unit.doc.meta.categories, ["jobs"]);
        assertEquals(unit.doc.usage.model.kind, UsageModelKind.FREE);
        assertEquals(result.httpStatus, status);
        assertEquals(result.isProviderError, status >= 400);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assertEquals(result.output, fixture.calls[0].res.body);
    });
}

Deno.test("omakase-box prepare: exact required/optional fields and no authentication at egress", async () => {
    const unit = await testSealedUnit("omakase-box#bounties/prepare");
    const fixture = await loadFixture(
        `${fixtures}synthetic-prepare-prepared.json`,
    );
    for (
        const sent of [body, {
            ...body,
            note: "Tried a parser. <untrusted>",
            boxignore: "private/\n*.local",
        }]
    ) {
        let calls = 0;
        const loaded = await new Engine({
            transport: directTransport({
                params: () => Promise.resolve({}),
                fetch: (url, init) => {
                    calls++;
                    assertEquals(
                        String(url),
                        "https://omakasebox.dev/api/agents/prepare",
                    );
                    assertEquals(init?.method, "POST");
                    assertEquals(JSON.parse(String(init?.body)), sent);
                    const headers = new Headers(init?.headers);
                    assertEquals(
                        headers.get("content-type"),
                        "application/json",
                    );
                    for (
                        const header of ["authorization", "cookie", "origin"]
                    ) assertEquals(headers.has(header), false);
                    return Promise.resolve(
                        Response.json(fixture.calls[0].res.body),
                    );
                },
            }),
        }).load(unit);
        const result = await loaded.run({ body: sent });
        assertEquals(calls, 1);
        assertEquals(result.output, fixture.calls[0].res.body);
    }
});

Deno.test("omakase-box prepare: empty, missing, extra and malformed fields rejected before transport", async () => {
    const unit = await testSealedUnit("omakase-box#bounties/prepare");
    const missing = Object.keys(body).map((key) =>
        Object.fromEntries(
            Object.entries(body).filter(([field]) => field !== key),
        )
    );
    for (
        const sent of [
            null,
            [],
            {},
            ...missing,
            { ...body, extra: true },
            ...["owner", "owner/repo/extra", "https://github.com/owner/repo"]
                .map((repository) => ({ ...body, repository })),
            ...["", "a".repeat(39), "A".repeat(40)].map((commit) => ({
                ...body,
                commit,
            })),
            ...["", "   ", "line\nbreak", "x".repeat(257)].map((title) => ({
                ...body,
                title,
            })),
            ...["", " \n ", null].map((task) => ({ ...body, task })),
            ...[0, -1, 1.5, 100001, "25"].map((reward) => ({
                ...body,
                reward,
            })),
            { ...body, note: null },
            { ...body, boxignore: [] },
            { ...body, paths: "src/a" },
            { ...body, paths: [null] },
            { ...body, paths: Array(2001).fill("src/a") },
            ...[
                "",
                "/absolute",
                "../outside",
                "a/../b",
                "a/./b",
                "a//b",
                "a/",
                "C:/file",
                "a\\b",
                "a\u0000b",
            ].map((path) => ({ ...body, paths: [path] })),
        ] as Json[]
    ) {
        await assertRejects(
            () => runEndpoint({ unit, input: { body: sent }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
        );
    }
    await assertRejects(
        () => runEndpoint({ unit, input: {}, mode: "replay" }),
        Error,
        "INVALID_INPUT",
    );
});

Deno.test("omakase-box prepare: inclusive bounds, empty manifest and optional strings preserved", async () => {
    const unit = await testSealedUnit("omakase-box#bounties/prepare");
    for (
        const sent of [
            { ...body, reward: 1, paths: [], note: "", boxignore: "" },
            {
                ...body,
                reward: 100000,
                paths: Array.from({ length: 2000 }, (_, n) => `f${n}`),
            },
            { ...body, paths: ["x".repeat(1024)] },
        ]
    ) {
        const fixture = await loadFixture(
            `${fixtures}synthetic-prepare-prepared.json`,
        );
        fixture.calls[0].req.body = sent;
        const result = await runEndpoint({
            unit,
            input: { body: sent },
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200);
        assertEquals(result.output, fixture.calls[0].res.body);
    }
    const description = unit.doc.meta.description ?? "";
    for (
        const limit of [
            "65536 UTF-8 bytes",
            "2000 entries",
            "10 prepares/minute",
            "without GitHub reads",
        ]
    ) assertStringIncludes(description, limit);
});
