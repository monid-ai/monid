import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    type Json,
    type OwnedResource,
    type RunInput,
    RunKind,
} from "@shared/core";
import { directTransport, Engine } from "@monid/connector-engine";
import {
    fixtureReader,
    loadEndpoint,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

/**
 * What the voygr endpoint tests share: the workspace's owned sub-account
 * row, replay by fixture name, and the checks every endpoint owes the
 * provider relay (binding, fail closed, what goes on the wire). The ids
 * are made up.
 */

export const SUB_ID = "sub_00000000000000000000000000000001";

export const OWNED: OwnedResource = {
    resource: "voygr/sub-account",
    externalId: SUB_ID,
    data: { reference: "monid:ws-1" },
};

const ZERO = { credits: {}, evidence: {} };

export interface Sent {
    url: string;
    method: string;
    headers: Headers;
    body: string | undefined;
}

/** The helpers for one endpoint: `id` (`voygr#get-call`) and the
 *  `endpointUrl` (`import.meta.url`) of its test, which finds `fixtures/`. */
export function harness(id: string, endpointUrl: string) {
    const dir = fromFileUrl(new URL("./fixtures/", endpointUrl));
    const fixture = (name: string) => loadFixture(`${dir}${name}.json`);

    /** Replay `name` through the whole engine with the row owned. */
    async function run(name: string, input: RunInput) {
        return await runEndpoint({
            unit: await testSealedUnit(id),
            input,
            mode: "replay",
            fixture: await fixture(name),
            resources: [OWNED],
            scopeKey: "ws-1",
        });
    }

    /** The body the fixture's first exchange answers with. */
    async function recorded(name: string): Promise<Json> {
        return (await fixture(name)).calls[0].res.body;
    }

    /** The engine over a stub that answers each request with `answer(url)`
     *  and records what went on the wire (replay never records headers or
     *  bodies). Poll waits and `utils.sleep` return at once; `slept`
     *  lists what they asked for. */
    async function wireWith(
        answer: (url: string, method: string) => Response,
        resources: OwnedResource[] = [OWNED],
    ) {
        const sent: Sent[] = [];
        const slept: number[] = [];
        const engine = new Engine({
            sleep: (ms) => {
                slept.push(ms);
                return Promise.resolve();
            },
            transport: directTransport({
                params: () => Promise.resolve({ apiKey: "test-key" }),
                fetch: (url, init) => {
                    sent.push({
                        url: String(url),
                        method: init?.method ?? "GET",
                        headers: new Headers(init?.headers),
                        body: typeof init?.body === "string"
                            ? init.body
                            : undefined,
                    });
                    return Promise.resolve(
                        answer(String(url), init?.method ?? "GET"),
                    );
                },
            }),
            resources: fixtureReader(resources),
            scopeKey: "ws-1",
        });
        return {
            loaded: await engine.load(await testSealedUnit(id)),
            sent,
            slept,
        };
    }

    /** `wireWith` where every request answers `status`/`body` as JSON. */
    function wire(
        status: number,
        body: Json,
        resources: OwnedResource[] = [OWNED],
    ) {
        return wireWith(() => Response.json(body, { status }), resources);
    }

    /** Run the endpoint against api.voygr.tech as the `monid:live-test`
     *  workspace. The key must have sub-accounts enabled: `ensure` creates
     *  (or finds) that sub-account first, as the host does before a
     *  workspace's first run, and the run gets it as owned. */
    async function live(input: RunInput) {
        const unit = await testSealedUnit(id);
        const seeds = await (await loadEndpoint({
            unit,
            input,
            mode: "live",
            scopeKey: "live-test",
        })).ensure(input);
        assertEquals(seeds.length, 1, JSON.stringify(seeds));
        return await runEndpoint({
            unit,
            input,
            mode: "live",
            scopeKey: "live-test",
            resources: seeds.map(({ resource, externalId, data }) => ({
                resource,
                externalId,
                data,
            })),
        });
    }

    return {
        fixture,
        run,
        live,
        recorded,
        wire,
        wireWith,

        /** The doc names the sub-account binding, and only it. */
        async assertBinding() {
            const { doc } = await testSealedUnit(id);
            assertEquals(doc.resources?.uses?.map((b) => b.id), [
                "voygr/sub-account",
            ]);
        },

        /** No owned sub-account (the relay, as when the ensure seeded
         *  nothing): 503 at zero, and nothing goes upstream. */
        async assertFailsClosed(input: RunInput) {
            const { loaded, sent } = await wire(200, {}, []);
            const result = await loaded.start(input);
            assert(result.kind === RunKind.COMPLETED);
            assertEquals(result.httpStatus, 503);
            assertEquals(
                (result.output as { code: string }).code,
                "SUB_ACCOUNT_UNAVAILABLE",
            );
            assertEquals(result.usage, ZERO);
            assertEquals(sent, []);
        },

        /** One request: this method and URL, the key, this workspace's
         *  sub-account and the expected body (none for a GET). */
        async assertOnTheWire(
            input: RunInput,
            expected: { method: string; url: string; body?: Json },
            answer: { status?: number; body?: Json } = {},
        ) {
            const { loaded, sent } = await wire(
                answer.status ?? 200,
                answer.body ?? {},
            );
            await loaded.run(input);
            assertEquals(sent.length, 1);
            assertEquals(sent[0].method, expected.method);
            assertEquals(sent[0].url, expected.url);
            assertEquals(
                sent[0].body === undefined
                    ? undefined
                    : JSON.parse(sent[0].body),
                expected.body,
            );
            assertEquals(sent[0].headers.get("x-api-key"), "test-key");
            assertEquals(sent[0].headers.get("x-sub-account"), SUB_ID);
        },
    };
}
