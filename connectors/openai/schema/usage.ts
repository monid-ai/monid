import { preset, Unit, UsageModelKind } from "@shared/core";

/** Standard synchronous rates for all three models, USD per token.
 * Pin each token, rather than rounding a receipt up to 1,000-token blocks.
 * Batch and streaming are not exposed. The official image guide says cached
 * rates apply only to the Responses image tool, not direct Images API calls.
 */
export const imageUsageModel = {
    kind: UsageModelKind.COMPOSITE,
    components: {
        input_text_token: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.TOKEN,
            label: "Input text tokens",
            description: "$5 per million input text tokens",
            consumes: { credit: "default", amount: 0.000005 },
        },
        input_image_token: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.TOKEN,
            label: "Input image tokens",
            description: "$8 per million input image tokens",
            consumes: { credit: "default", amount: 0.000008 },
        },
        output_image_token: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.TOKEN,
            label: "Output image tokens",
            description: "$30 per million output image tokens",
            consumes: { credit: "default", amount: 0.000030 },
        },
    },
} as const;

export type ImageUsageModel = typeof imageUsageModel;

type ImageEstimate = (ctx: {
    data: {
        input: {
            body: {
                prompt: string;
                size: string;
                quality: string;
                images?: string[];
                mask?: string;
            };
        };
    };
}) => {
    counts: {
        input_text_token: number;
        input_image_token: number;
        output_image_token: number;
    };
};

/** The existing preset carrier serializes the grid and reference flag as
 * arguments, so all six endpoints share one closed factory in the fnTable.
 * Field names stay fixed and schema-typed, rather than configurable strings.
 * Calculator: https://developers.openai.com/api/docs/guides/image-generation
 */
export const imageEstimate = preset(
    "openai.imageEstimate",
    (grid: Record<string, number>, countReferences: boolean): ImageEstimate =>
    ({ data }) => {
        const body = data.input.body;
        const [width, height] = body.size.split("x").map(Number);
        const pixels = width * height;
        const longEdge = grid[body.quality];
        const shortExact = longEdge /
            (Math.max(width, height) / Math.min(width, height));
        const floor = Math.floor(shortExact);
        const shortEdge = shortExact - floor === 0.5
            ? floor + floor % 2
            : Math.round(shortExact);
        const outputTokens = Math.ceil(
            longEdge * shortEdge * (2000000 + pixels) / 4000000,
        );
        let promptBytes = 0;
        for (const character of body.prompt) {
            const code = character.codePointAt(0) ?? 0;
            promptBytes += code <= 0x7f
                ? 1
                : code <= 0x7ff
                ? 2
                : code <= 0xffff
                ? 3
                : 4;
        }
        return {
            counts: {
                input_text_token: promptBytes,
                input_image_token: countReferences
                    ? 1500 * ((body.images?.length ?? 0) +
                        (body.mask === undefined ? 0 : 1))
                    : 0,
                // Admission must not fail with FN_CONTRACT before start can
                // return invalid_size. Only start validates dimension limits.
                output_image_token: Number.isFinite(outputTokens)
                    ? outputTokens
                    : 0,
            },
        };
    },
);
