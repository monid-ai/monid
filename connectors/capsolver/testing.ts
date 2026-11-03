import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import { directTransport, Engine } from "@monid/connector-engine";
import {
    type Fixture,
    liveSkip,
    loadFixture,
    replayFetch,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

export const TEST_KEY = "capsolver-test-credential";
export const PAGE = {
    websiteURL: "https://example.com/login",
    websiteKey: "public-test-site-key",
};

export function fixture(name: string): Promise<Fixture> {
    return loadFixture(
        fromFileUrl(new URL(`./fixtures/${name}.json`, import.meta.url)),
    );
}

/** Replay the compiled artifact and verify every authenticated wire request.
 * The shared replay matcher checks method/URL only; this wrapper also checks
 * JSON mapping, credential injection, task IDs, and complete consumption. */
export async function replayTask(
    endpoint: string,
    body: Json,
    expectedTask: Json,
    recording: Fixture,
) {
    const unit = await testSealedUnit(`capsolver#solve/${endpoint}`);
    const serve = replayFetch(recording);
    let calls = 0;
    const engine = new Engine({
        sleep: () => Promise.resolve(),
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: TEST_KEY }),
            fetch: async (input, init) => {
                const expected = recording.calls[calls];
                assert(
                    expected,
                    "the engine must not issue unrecorded requests",
                );
                assertEquals(init?.method, "POST");
                assertEquals(
                    new Headers(init?.headers).get("content-type"),
                    "application/json",
                );
                const actualBody = JSON.parse(String(init?.body));
                assertEquals(
                    actualBody,
                    calls === 0
                        ? { task: expectedTask, clientKey: TEST_KEY }
                        : {
                            ...expected.req.body as Record<string, Json>,
                            clientKey: TEST_KEY,
                        },
                );
                const response = await serve(input, init);
                calls++;
                return response;
            },
        }),
    });
    const loaded = await engine.load(unit);
    const result = await loaded.run({ body });
    assertEquals(
        calls,
        recording.calls.length,
        "all recorded calls must be consumed",
    );
    return result;
}

export function liveTest(
    endpoint: string,
    input: RunInput | undefined,
    tokenField: string,
) {
    Deno.test({
        name:
            `capsolver#solve/${endpoint}: live (explicit opt-in and credentials)`,
        ignore: input === undefined ||
            Deno.env.get("CAPSOLVER_LIVE_TESTS") !== "1" ||
            liveSkip("capsolver"),
        fn: async () => {
            assert(input, "live input must be configured");
            const result = await runEndpoint({
                unit: await testSealedUnit(`capsolver#solve/${endpoint}`),
                input,
                mode: "live",
            });
            assertEquals(result.httpStatus, 200);
            assertEquals(result.isProviderError, false);
            const output = result.output as {
                solution: Record<string, unknown>;
            };
            const token = output.solution[tokenField];
            assert(typeof token === "string" && token.trim().length > 0);
            assertEquals(result.usage.evidence, { CALL: 1 });
        },
    });
}
