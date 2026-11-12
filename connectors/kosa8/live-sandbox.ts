import { assert, assertEquals } from "@std/assert";
import type { Json, OwnedResource } from "@shared/core";
import type { RunCompleted } from "@monid/connector-engine";
import { runEndpoint, testSealedUnit } from "@shared/testing";

/**
 * The kosa8 live tests' one sandbox lifecycle. Each live test that needs a
 * sandbox creates its own through `kosa8#create-sandbox` (base template,
 * the smallest image; `ttl_s` 300, so kosa8 deletes it within five minutes
 * even if this process dies) and always deletes it in `finally` through
 * `kosa8#delete-sandbox`, so a failing assertion never leaves a billed
 * sandbox running. The cleanup delete accepts 404 for the delete-sandbox
 * test, which has already deleted it.
 */

export const FREE_RUN = { credits: {}, evidence: {} };

export interface LiveSandbox {
    id: string;
    /** The owned row the ownership gate of the other endpoints reads. */
    owned: OwnedResource[];
    created: RunCompleted;
}

export async function withLiveSandbox(
    fn: (sandbox: LiveSandbox) => Promise<void>,
): Promise<void> {
    const created = await runEndpoint({
        unit: await testSealedUnit("kosa8#create-sandbox"),
        input: { body: { template: "base", ttl_s: 300 } },
        mode: "live",
        resources: [],
    });
    const seed = created.resources?.provisions?.[0];
    const id = seed?.externalId ??
        ((created.output as Record<string, Json> | null)?.sandbox as
            | Record<string, Json>
            | undefined)?.id;
    // a refused create started nothing, so there is nothing to clean up
    if (typeof id !== "string") {
        throw new Error(`create-sandbox: ${JSON.stringify(created.output)}`);
    }
    const owned: OwnedResource[] = [{
        resource: "kosa8/sandbox",
        externalId: id,
        data: seed?.data ?? {},
        syncedAt: new Date().toISOString(),
    }];
    try {
        await fn({ id, owned, created });
    } finally {
        const deleted = await runEndpoint({
            unit: await testSealedUnit("kosa8#delete-sandbox"),
            input: { pathParams: { id } },
            mode: "live",
            resources: owned,
        });
        assert(
            deleted.httpStatus === 200 || deleted.httpStatus === 404,
            `cleanup delete of ${id}: ${JSON.stringify(deleted.output)}`,
        );
    }
}

/** Shape of a `{sandbox}` answer: an id, a state, no `cost_usd`. */
export function assertSandboxShape(output: Json, id: string): void {
    const sandbox = (output as Record<string, Json>).sandbox as Record<
        string,
        Json
    >;
    assertEquals(sandbox.id, id);
    assertEquals(typeof sandbox.state, "string");
    assertEquals(typeof sandbox.cpus, "number");
    assertEquals(typeof sandbox.mem_mb, "number");
    assertEquals("cost_usd" in sandbox, false);
}
