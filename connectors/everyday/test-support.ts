import type { Json, RunInput, SealedUnit } from "@shared/core";
import {
    directTransport,
    Engine,
    type RunCompleted,
} from "@monid/connector-engine";
import { type Fixture, replayFetch } from "@shared/testing";

export interface CapturedRequest {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: Json;
}

export interface CredentialLookup {
    provider: string;
    fields: string[];
}

export async function everydayHarness(
    unit: SealedUnit,
    fixture?: Fixture,
): Promise<{
    run(input: RunInput): Promise<RunCompleted>;
    calls: CapturedRequest[];
    credentialLookups: CredentialLookup[];
}> {
    const calls: CapturedRequest[] = [];
    const credentialLookups: CredentialLookup[] = [];
    const upstream = fixture
        ? replayFetch(fixture, {
            "request.url": unit.doc.request.url,
            "request.origin": new URL(unit.doc.request.url).origin,
        })
        : fetch;
    const capturedFetch: typeof fetch = (input, init) => {
        const url = typeof input === "string"
            ? input
            : input instanceof URL
            ? input.href
            : input.url;
        const body = typeof init?.body === "string"
            ? JSON.parse(init.body) as Json
            : undefined;
        calls.push({
            url,
            method: init?.method ?? "GET",
            headers: Object.fromEntries(new Headers(init?.headers)),
            ...(body !== undefined ? { body } : {}),
        });
        return upstream(input, init);
    };
    const engine = new Engine({
        transport: directTransport({
            params: (provider, fields) => {
                credentialLookups.push({
                    provider,
                    fields: [...(fields ?? [])],
                });
                return Promise.resolve({});
            },
            fetch: capturedFetch,
        }),
        ...(fixture ? { sleep: () => Promise.resolve() } : {}),
    });
    const loaded = await engine.load(unit);
    return {
        run: (input) => loaded.run(input),
        calls,
        credentialLookups,
    };
}

export function oneCallFixture(
    name: string,
    description: string,
    body: Json,
    status = 200,
): Fixture {
    return {
        name,
        description,
        calls: [{
            req: {
                method: "POST",
                url: "{{request.url}}",
            },
            res: { status, body },
        }],
    };
}
