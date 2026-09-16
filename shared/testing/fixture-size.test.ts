import { assert, assertEquals } from "@std/assert";
import { walk } from "@std/fs";
import { fromFileUrl, join, relative } from "@std/path";
import {
    pickRecordedHeaders,
    recordingFetch,
    replayFetch,
    scrubCalls,
    trimCalls,
    trimJson,
} from "./fixtures.ts";

/**
 * FIXTURE-SIZE LINT (fixture-diet policy, design D11 of
 * add-async-run-protocol): fixtures are TRIMMED recordings — the wire chain
 * is real, the payload bulk is capped at record time. This lint bounds the
 * files so untrimmed recordings (or bloated synthetics) cannot land:
 * warn > 32 KiB, fail > 128 KiB. Over the warn line? Re-record (trim is the
 * default) or run the trim over the existing recording.
 */
const WARN_BYTES = 32 * 1024;
const FAIL_BYTES = 128 * 1024;

const REPO_ROOT = fromFileUrl(new URL("../../", import.meta.url));

Deno.test("fixture-size lint: fixtures stay trimmed (warn 32KiB, fail 128KiB)", async () => {
    const failures: string[] = [];
    for await (
        const entry of walk(join(REPO_ROOT, "connectors"), {
            includeDirs: false,
            exts: [".json"],
            match: [/fixtures/],
        })
    ) {
        const bytes = (await Deno.stat(entry.path)).size;
        const where = relative(REPO_ROOT, entry.path);
        if (bytes > FAIL_BYTES) {
            failures.push(`${where}: ${bytes} bytes > ${FAIL_BYTES}`);
        } else if (bytes > WARN_BYTES) {
            console.warn(
                `[fixture-size] WARN ${where}: ${bytes} bytes > ${WARN_BYTES} — ` +
                    `consider re-recording (trim is the default)`,
            );
        }
    }
    assert(
        failures.length === 0,
        `untrimmed fixtures (re-record, or apply trimCalls):\n${
            failures.join("\n")
        }`,
    );
});

Deno.test("trimJson: arrays capped, long strings truncated, structure/keys intact", () => {
    const long = "x".repeat(600);
    assertEquals(
        trimJson({
            items: [1, 2, 3, 4],
            nested: { deep: [{ text: long }, "b", "c"] },
            short: "ok",
            n: 5,
            none: null,
        }),
        {
            items: [1, 2],
            nested: { deep: [{ text: "x".repeat(500) }, "b"] },
            short: "ok",
            n: 5,
            none: null,
        },
    );
});

Deno.test("trimCalls: responses trimmed, the wire chain (requests/statuses) untouched", () => {
    const calls = [{
        req: {
            method: "POST",
            url: "https://api.test/jobs",
            body: { many: [1, 2, 3, 4, 5] }, // request bodies are NEVER trimmed
        },
        res: { status: 201, body: { rows: [1, 2, 3, 4, 5] } },
    }];
    assertEquals(trimCalls(calls), [{
        req: {
            method: "POST",
            url: "https://api.test/jobs",
            body: { many: [1, 2, 3, 4, 5] },
        },
        res: { status: 201, body: { rows: [1, 2] } },
    }]);
});

// ---------------------------------------------------------------------------
// RESPONSE HEADERS: allowlisted, round-tripped between record and replay.
// ---------------------------------------------------------------------------

Deno.test("pickRecordedHeaders: only the allowlist survives", () => {
    assertEquals(
        pickRecordedHeaders(
            new Headers({
                location: "https://s3.test/mesh.glb?sig=abc",
                "set-cookie": "session=secret",
                "x-ratelimit-remaining": "41",
                "content-type": "application/json",
            }),
        ),
        { location: "https://s3.test/mesh.glb?sig=abc" },
        "set-cookie / ratelimit / content-type never reach disk",
    );
    assertEquals(
        pickRecordedHeaders(
            new Headers({ "content-type": "application/json" }),
        ),
        undefined,
        "no allowlisted header ⇒ the field is omitted entirely",
    );
});

Deno.test("recordingFetch: an allowlisted header is captured AND relayed", async () => {
    const sink: Parameters<typeof scrubCalls>[0] = [];
    const wrapped = recordingFetch(
        () =>
            Promise.resolve(
                new Response("", {
                    status: 302,
                    headers: {
                        location: "https://s3.test/mesh.glb?sig=abc",
                        "set-cookie": "session=secret",
                    },
                }),
            ),
        sink,
    );
    const relayed = await wrapped("https://api.test/models/j1/download", {
        method: "GET",
    });
    // the FIXTURE carries it …
    assertEquals(sink[0].res.headers, {
        location: "https://s3.test/mesh.glb?sig=abc",
    });
    // … and so does the response the live run observes (without this the
    // recording run and its replay would see different exchanges)
    assertEquals(
        relayed.headers.get("location"),
        "https://s3.test/mesh.glb?sig=abc",
    );
    assertEquals(relayed.headers.get("set-cookie"), null);
});

Deno.test("replayFetch: recorded headers are served back; absent ⇒ none", async () => {
    const serve = replayFetch({
        name: "redirect",
        description: "302 whose Location is the payload",
        calls: [
            {
                req: { method: "GET", url: "https://api.test/d" },
                res: {
                    status: 302,
                    headers: { location: "https://s3.test/m.glb" },
                    body: null,
                },
            },
            {
                req: { method: "GET", url: "https://api.test/plain" },
                res: { status: 200, body: { ok: true } },
            },
        ],
    });
    const redirect = await serve("https://api.test/d", { method: "GET" });
    assertEquals(redirect.status, 302);
    assertEquals(redirect.headers.get("location"), "https://s3.test/m.glb");
    const plain = await serve("https://api.test/plain", { method: "GET" });
    assertEquals(plain.headers.get("location"), null);
});

Deno.test("trimCalls/scrubCalls: response headers ride through both passes", () => {
    const calls = [{
        req: { method: "GET", url: "https://api.test/d" },
        res: {
            status: 302,
            headers: { location: "https://s3.test/m.glb" },
            body: { rows: [1, 2, 3, 4, 5], who: "a@b.com" },
        },
    }];
    assertEquals(trimCalls(calls)[0].res.headers, {
        location: "https://s3.test/m.glb",
    });
    assertEquals(scrubCalls(calls)[0].res.headers, {
        location: "https://s3.test/m.glb",
    });
});
