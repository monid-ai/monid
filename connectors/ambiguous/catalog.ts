import { z } from "zod";
import { defineEndpoint } from "@shared/core";

type Schema = Record<string, unknown>;
export interface ApiOperation {
    operationId: string;
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    path: string;
    description: string;
    tags: string[];
    annotations: {
        readOnly?: boolean;
        destructive?: boolean;
        openWorld?: boolean;
    };
    inputs: Partial<
        Record<"body" | "pathParams" | "queryParams" | "headers", Schema>
    >;
    multipart: boolean;
}
interface ApiDocument {
    paths: Record<
        string,
        Record<string, {
            operationId: string;
            description?: string;
            summary?: string;
            tags?: string[];
            "x-tool"?: {
                expose?: string[];
                annotations?: ApiOperation["annotations"];
            };
            parameters?: {
                name: string;
                in: string;
                required?: boolean;
                schema: Schema;
            }[];
            requestBody?: { content?: Record<string, { schema: Schema }> };
        }>
    >;
    components: { schemas: Record<string, Schema> };
}
const document = JSON.parse(
    Deno.readTextFileSync(new URL("./openapi.json", import.meta.url)),
) as ApiDocument;
export const coverage: {
    operationId: string;
    method: string;
    path: string;
    exposed: boolean;
    expose: string[];
}[] = [];
const apiOperations: ApiOperation[] = [];
for (const [path, methods] of Object.entries(document.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
        if (
            !["get", "post", "put", "patch", "delete", "head", "options"]
                .includes(method)
        ) continue;
        const expose = operation["x-tool"]?.expose ?? [];
        const exposed = expose.includes("all") || expose.includes("mcp");
        coverage.push({
            operationId: operation.operationId,
            method: method.toUpperCase(),
            path,
            exposed,
            expose,
        });
        if (!exposed) continue;
        const inputs: ApiOperation["inputs"] = {};
        for (
            const [location, key] of [["path", "pathParams"], [
                "query",
                "queryParams",
            ], ["header", "headers"]] as const
        ) {
            const params = (operation.parameters ?? []).filter((parameter) =>
                parameter.in === location && parameter.name !== "API-Version"
            );
            if (params.length) {
                inputs[key] = {
                    type: "object",
                    properties: Object.fromEntries(
                        params.map((
                            parameter,
                        ) => [parameter.name, parameter.schema]),
                    ),
                    required: params.filter((parameter) => parameter.required)
                        .map((parameter) => parameter.name),
                    additionalProperties: false,
                };
            }
        }
        const pathSchema = inputs.pathParams ??
            {
                type: "object",
                properties: {},
                required: [],
                additionalProperties: false,
            };
        const properties = pathSchema.properties as Record<string, Schema>;
        if ("monid_connection" in properties) {
            throw new Error(
                "Upstream parameter collides with the connection selector",
            );
        }
        properties.monid_connection = {
            type: "string",
            format: "uuid",
            description:
                "Owned connection ID from connections/create or connections/connect.",
        };
        (pathSchema.required as string[]).push("monid_connection");
        inputs.pathParams = pathSchema;
        const media = operation.requestBody?.content ?? {};
        const multipart = "multipart/form-data" in media;
        const body =
            media[multipart ? "multipart/form-data" : "application/json"];
        if (body) inputs.body = body.schema;
        apiOperations.push({
            operationId: operation.operationId,
            method: method.toUpperCase() as ApiOperation["method"],
            path,
            description: operation.description ?? operation.summary ??
                operation.operationId.replaceAll("_", " "),
            tags: operation.tags ?? [],
            annotations: operation["x-tool"]?.annotations ?? {},
            inputs,
            multipart,
        });
    }
}
apiOperations.sort((a, b) => a.operationId.localeCompare(b.operationId));
export const catalog = {
    operations: apiOperations,
    schemas: document.components.schemas,
};
const operations = new Map(
    catalog.operations.map((operation) => [operation.operationId, operation]),
);

function resolved(schema: Schema): Schema {
    return typeof schema.$ref === "string"
        ? resolved(catalog.schemas[schema.$ref.split("/").at(-1)!])
        : schema;
}

function inputSchema(schema: Schema): z.ZodType {
    const definitions: Record<string, unknown> = {};
    const rewrite = (value: unknown): unknown => {
        if (Array.isArray(value)) return value.map(rewrite);
        if (!value || typeof value !== "object") return value;
        const node = value as Schema;
        if (node.format === "binary") {
            return {
                type: "object",
                properties: {
                    filename: { type: "string", minLength: 1 },
                    contentType: { type: "string" },
                    dataBase64: { type: "string", maxLength: 140000000 },
                },
                required: ["filename", "dataBase64"],
                additionalProperties: false,
            };
        }
        if (typeof node.$ref === "string") {
            const name = node.$ref.split("/").at(-1)!;
            if (!Object.hasOwn(definitions, name)) {
                definitions[name] = {};
                if (!catalog.schemas[name]) {
                    throw new Error(`Unresolved API schema: ${name}`);
                }
                definitions[name] = rewrite(catalog.schemas[name]);
            }
            return { ...node, $ref: `#/$defs/${name}` };
        }
        return Object.fromEntries(
            Object.entries(node).filter(([key]) => key !== "default").map((
                [key, item],
            ) => [key, rewrite(item)]),
        );
    };
    const root = rewrite(schema) as Schema;
    return z.fromJSONSchema(
        { ...root, $defs: definitions } as Parameters<
            typeof z.fromJSONSchema
        >[0],
    );
}

export function apiEndpoint(operationId: string) {
    const operation = operations.get(operationId);
    if (!operation) {
        throw new Error(`Unknown Ambiguous operation: ${operationId}`);
    }
    const schema = Object.fromEntries(
        Object.entries(operation.inputs).map((
            [name, value],
        ) => [name, inputSchema(value)]),
    );
    const properties = operation.inputs.body
        ? resolved(operation.inputs.body).properties as
            | Record<string, Schema>
            | undefined
        : undefined;
    const fileFields = operation.multipart
        ? Object.entries(properties ?? {}).filter(([, value]) =>
            resolved(value).format === "binary"
        ).map(([name]) => name)
        : undefined;
    if (operation.multipart && !fileFields?.length) {
        throw new Error(
            `Multipart operation has no declared file: ${operationId}`,
        );
    }
    const asynchronous = [
        "documents_completions",
        "mail_smart_compose",
        "audio_transcribe",
    ].includes(operationId);
    return defineEndpoint({
        meta: {
            displayName: operationId.replaceAll("_", " "),
            summary: operation.description.split("\n")[0],
            description: operation.description,
            annotations: {
                readOnly: operation.method === "GET",
                destructive: operation.method === "DELETE",
                ...operation.annotations,
            },
        },
        endpoint: `/${operationId}`,
        request: {
            method: operation.method,
            path: operation.path,
            ...(operation.multipart
                ? { bodyEncoding: "multipart" as const, fileFields }
                : {}),
        },
        input: { schema },
        resources: {
            uses: [{
                id: "ambiguous/connection",
                key: "$.pathParams.monid_connection",
                as: "connection",
            }],
        },
        ...(asynchronous
            ? {
                lifecycle: {
                    start: async () => ({ kind: "RUNNING" as const }),
                    poll: async (
                        { utils }: {
                            utils: import("@shared/core").LifecycleUtils;
                        },
                    ) => {
                        const result = await utils.request();
                        return {
                            kind: "COMPLETED" as const,
                            httpStatus: result.status,
                            output: result.body,
                        };
                    },
                },
            }
            : {}),
        timeouts: { requestMs: 300_000, runMs: 310_000 },
    });
}
