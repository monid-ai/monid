import { fromFileUrl } from "@std/path";
import type { Json, OwnedResource, RunInput } from "@shared/core";
import { directTransport, Engine } from "@monid/connector-engine";
import {
    fixtureReader,
    loadEndpoint,
    loadFixture,
    testSealedUnit,
} from "@shared/testing";

const FIXTURES = fromFileUrl(new URL("./fixtures/", import.meta.url));
export const fixture = (name: string) => loadFixture(FIXTURES + name + ".json");

export const MAILBOX: OwnedResource = {
    resource: "agentmail/mailbox",
    externalId: "synthetic-inbox@agentmail.to",
    data: {
        upstreamInboxId: "mbx-1",
        email: "synthetic-inbox@agentmail.to",
        displayName: "Synthetic Inbox",
        createdAt: "2026-10-27T00:00:00Z",
    },
    syncedAt: "2026-10-27T00:00:00.000Z",
};

export const INBOX_INPUT = { body: { inboxId: MAILBOX.externalId } };

/** Capture actual requests from a COMPILED unit; responses reuse the
 * provider's explicitly synthetic fixture data. This checks the engine's
 * result, usage and provision effects as well as the wire mapping. */
export async function captureEndpoint(
    id: string,
    response: { status: number; body: Json },
    rows: OwnedResource[] = [MAILBOX],
) {
    const sent: {
        url: string;
        method: string;
        headers: Headers;
        body: Json | undefined;
    }[] = [];
    const loaded = await new Engine({
        resources: fixtureReader(rows),
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (url, init) => {
                sent.push({
                    url: String(url),
                    method: init?.method ?? "GET",
                    headers: new Headers(init?.headers),
                    body: init?.body === undefined
                        ? undefined
                        : JSON.parse(String(init.body)),
                });
                return Promise.resolve(
                    new Response(
                        response.status === 204
                            ? null
                            : JSON.stringify(response.body),
                        {
                            status: response.status,
                            headers: { "content-type": "application/json" },
                        },
                    ),
                );
            },
        }),
    }).load(await testSealedUnit(id));
    return { loaded, sent };
}

/** Resource-bound units need a reader even for pure estimates. */
export async function estimateMailbox(id: string, input: RunInput) {
    const loaded = await loadEndpoint({
        unit: await testSealedUnit(id),
        input,
        mode: "replay",
    });
    return loaded.estimate(input);
}
