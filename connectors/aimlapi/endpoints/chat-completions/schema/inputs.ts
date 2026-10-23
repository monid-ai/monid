import { z } from "zod";

/**
 * `POST /chat/completions` request body — the OpenAI-compatible shape
 * AI/ML API accepts on its chat families (`openai/chat-completions` and
 * `anthropic/messages` models both answer here). Optionality only (D25):
 * no defaults, no tightening — the binding owns both.
 *
 * Deliberately NOT mirrored: `stream` / `stream_options` (the engine
 * settles one envelope — an SSE body would arrive as an undecodable
 * string), and `max_completion_tokens` (the newer OpenAI spelling of the
 * same cap: exposing both would give the pre-run hold two knobs to
 * disagree about, so the connector takes `max_tokens`, which every chat
 * model on the gateway accepts).
 */

const zTextPart = z.object({
    type: z.literal("text"),
    text: z.string().describe("Text content."),
});

const zImagePart = z.object({
    type: z.literal("image_url"),
    image_url: z.object({
        url: z.string().describe(
            "Image as an https URL or a `data:image/...;base64,` URI. " +
                "Requires a vision-capable model.",
        ),
    }),
});

const zContent = z.union([
    z.string(),
    z.array(z.union([zTextPart, zImagePart])),
]);

const zToolCall = z.object({
    id: z.string(),
    type: z.literal("function"),
    function: z.object({
        name: z.string(),
        arguments: z.string().describe("JSON-encoded arguments."),
    }),
});

const zMessage = z.union([
    z.object({
        role: z.literal("system"),
        content: zContent.describe("System instructions."),
    }),
    z.object({
        role: z.literal("user"),
        content: zContent.describe("User turn: text or text + images."),
    }),
    z.object({
        role: z.literal("assistant"),
        content: zContent.nullable().optional().describe(
            "A prior assistant turn.",
        ),
        tool_calls: z.array(zToolCall).optional().describe(
            "Tool calls the assistant made on that turn.",
        ),
    }),
    z.object({
        role: z.literal("tool"),
        content: zContent.describe("The tool's result."),
        tool_call_id: z.string().describe("The `id` of the call answered."),
    }),
]);

const zTool = z.object({
    type: z.literal("function"),
    function: z.object({
        name: z.string(),
        description: z.string().optional(),
        parameters: z.record(z.string(), z.unknown()).optional().describe(
            "JSON Schema for the function arguments.",
        ),
    }),
});

export const zChatCompletionsBody = z.object({
    model: z.string().min(1).describe(
        "Gateway model id, vendor prefix included — e.g. " +
            "`openai/gpt-4o-mini`, `anthropic/claude-opus-5.5`, " +
            "`deepseek/deepseek-v4-pro-0813`. List the ones callable here " +
            "with `aimlapi#models` (its `chat` array); ids are never " +
            "pinned in this connector.",
    ),
    messages: z.array(zMessage).min(1).describe(
        "The conversation so far, oldest first.",
    ),
    max_tokens: z.number().int().min(1).optional().describe(
        "Upper bound on generated tokens, reasoning included.",
    ),
    temperature: z.number().min(0).max(2).optional(),
    top_p: z.number().min(0).max(1).optional(),
    frequency_penalty: z.number().min(-2).max(2).optional(),
    presence_penalty: z.number().min(-2).max(2).optional(),
    stop: z.union([z.string(), z.array(z.string()).max(4)]).optional(),
    seed: z.number().int().optional(),
    n: z.number().int().min(1).optional().describe(
        "How many completions to generate. Each one is billed.",
    ),
    reasoning_effort: z.enum(["none", "minimal", "low", "medium", "high"])
        .optional().describe(
            "Reasoning depth on models that support it (per-model subset).",
        ),
    response_format: z.union([
        z.object({ type: z.literal("text") }),
        z.object({ type: z.literal("json_object") }),
        z.object({
            type: z.literal("json_schema"),
            json_schema: z.object({
                name: z.string(),
                schema: z.record(z.string(), z.unknown()),
                strict: z.boolean().optional(),
            }),
        }),
    ]).optional().describe(
        "Structured output: `json_schema` enforces a schema on models " +
            "that support it.",
    ),
    tools: z.array(zTool).optional().describe(
        "Functions the model may call (models with function calling).",
    ),
    tool_choice: z.union([
        z.enum(["none", "auto", "required"]),
        z.object({
            type: z.literal("function"),
            function: z.object({ name: z.string() }),
        }),
    ]).optional(),
    parallel_tool_calls: z.boolean().optional(),
});
