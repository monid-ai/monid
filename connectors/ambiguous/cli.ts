import { z } from "zod";
import { Engine } from "@monid/connector-engine";
import { sealUnit, zRunInput } from "@shared/core";
import { compileToOutput } from "../../scripts/lib.ts";
import { AmbiguousConnections, ConnectionError } from "./connections.ts";
import { FileConnectionStore } from "./file-store.ts";
import { signupInput } from "./schema/signup.ts";

const inputSchema = z.discriminatedUnion("action", [
    z.object({ action: z.literal("create"), signup: signupInput }).strict(),
    z.object({
        action: z.literal("connect"),
        setupCode: z.string(),
        workspaceId: z.uuid().optional(),
    }).strict(),
    z.object({
        action: z.literal("connect-token"),
        token: z.string(),
        workspaceId: z.uuid().optional(),
    }).strict(),
    z.object({ action: z.literal("get"), connectionId: z.uuid() }).strict(),
    z.object({ action: z.literal("disconnect"), connectionId: z.uuid() })
        .strict(),
    z.object({
        action: z.literal("run"),
        connectionId: z.uuid(),
        endpoint: z.string().startsWith("ambiguous#"),
        input: zRunInput,
    }).strict(),
]);

async function main() {
    const scope = Deno.env.get("AMBIGUOUS_CONNECTION_SCOPE");
    const hexKey = Deno.env.get("AMBIGUOUS_CONNECTION_KEY");
    if (!scope || !hexKey || !/^[a-fA-F0-9]{64}$/.test(hexKey)) {
        throw new ConnectionError(
            "Set AMBIGUOUS_CONNECTION_SCOPE and a persistent 64-hex-character AMBIGUOUS_CONNECTION_KEY",
        );
    }
    const key = await crypto.subtle.importKey(
        "raw",
        new Uint8Array(
            hexKey.match(/../g)!.map((value) => parseInt(value, 16)),
        ),
        "AES-GCM",
        false,
        ["encrypt", "decrypt"],
    );
    const manager = new AmbiguousConnections(
        new FileConnectionStore(
            Deno.env.get("AMBIGUOUS_CONNECTION_DIR") ??
                ".output/ambiguous-connections",
        ),
        key,
    );
    const input = inputSchema.parse(
        await new Response(Deno.stdin.readable).json(),
    );
    switch (input.action) {
        case "create":
            return await manager.create(scope, input.signup);
        case "connect":
            return await manager.connectSetupCode(
                scope,
                input.setupCode,
                input.workspaceId,
            );
        case "connect-token":
            return await manager.connectToken(
                scope,
                input.token,
                input.workspaceId,
            );
        case "get":
            return await manager.get(scope, input.connectionId);
        case "disconnect":
            await manager.disconnect(scope, input.connectionId);
            return { disconnected: true };
        case "run": {
            const { bundle } = await compileToOutput();
            const endpoint = await new Engine({
                transport: manager.transport(scope, input.connectionId),
            }).load(sealUnit(bundle, input.endpoint));
            return await endpoint.run(input.input);
        }
    }
}

if (import.meta.main) {
    try {
        console.log(JSON.stringify(await main()));
    } catch (error) {
        console.error(
            error instanceof z.ZodError || error instanceof SyntaxError
                ? "Invalid connection command"
                : error instanceof ConnectionError
                ? error.message
                : `Connection command failed (${
                    error instanceof Error ? error.name : "unknown error"
                })`,
        );
        Deno.exitCode = 1;
    }
}
