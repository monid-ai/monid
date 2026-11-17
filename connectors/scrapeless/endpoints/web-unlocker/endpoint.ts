import { defineEndpoint } from "@shared/core";
import { zUnlockerBody } from "./schema/inputs.ts";
import { zNativeOutput } from "../../schema/common.ts";
import { unlockerStart } from "../../unlocker-protocol.ts";

export default defineEndpoint({
    endpoint: "/web-unlocker",
    meta: {
        displayName: "Web Unlocker",
        summary:
            "Fetch static or rendered page content and structured outputs.",
        description:
            "Provide input.url and supported request/rendering options. Returns native code/data under provider_response. headers maps to the verified header wire field. CSV content outputs map to arrays; empty/omitted content selection becomes the explicit twelve-output list, matching the guide's all-output semantics and a real success sample. This happens before one submission, not via a paid retry; raw upstream empty forms remain anomalous. Keyboard/Markdown, plaintext, PNG/JPEG, network capture and explicit content selection have representative live evidence. Network combined filtering has a four-event versus one-event contrast, not full independent filter semantics. Structured content/network/image errors retain native data. Wait instructions have a documented cumulative 180-second limit; page initialization/load has a separate 30-second limit.",
        docsUrl: "https://docs.scrapeless.com/en/docs/web-unlocker/js-render/",
        categories: ["web-scraping"],
    },
    request: {
        baseUrl: "https://api.scrapeless.com",
        method: "POST",
        path: "/api/v2/unlocker/request",
    },
    input: {
        schema: { body: zUnlockerBody },
        toRequest: ({ data, utils }) => {
            const body = data.input.body ?? null;
            const input = utils.json.optionalGet(body, "$.input");
            if (
                body === null || typeof body !== "object" ||
                Array.isArray(body) ||
                input === null || typeof input !== "object" ||
                Array.isArray(input)
            ) return data.input;
            // Only remove the alias at this level; custom header names stay intact.
            const mapped = Object.fromEntries(
                Object.entries(input).filter(([key]) => key !== "headers"),
            );
            if (input.headers !== undefined) mapped.header = input.headers;
            const render = input.jsRender;
            if (
                render !== null && typeof render === "object" &&
                !Array.isArray(render)
            ) {
                const response = render.response;
                if (
                    response !== null && typeof response === "object" &&
                    !Array.isArray(response) && response.type === "content"
                ) {
                    const options = response.options;
                    const selection = options !== null &&
                            typeof options === "object" &&
                            !Array.isArray(options)
                        ? options.outputs
                        : undefined;
                    const all = selection === undefined || selection === "" ||
                        (Array.isArray(selection) && selection.length === 0);
                    if (
                        all || typeof selection === "string"
                    ) {
                        // Docs define empty selection as ALL. Raw empty forms
                        // failed; the explicit full list passed a real 2026-10-23
                        // request. Normalize BEFORE the single paid submission.
                        mapped.jsRender = {
                            ...render,
                            response: {
                                ...response,
                                options: {
                                    ...(options !== null &&
                                            typeof options === "object" &&
                                            !Array.isArray(options)
                                        ? options
                                        : {}),
                                    outputs: all
                                        ? [
                                            "phone_numbers",
                                            "headings",
                                            "images",
                                            "audios",
                                            "videos",
                                            "links",
                                            "menus",
                                            "hashtags",
                                            "emails",
                                            "metadata",
                                            "tables",
                                            "favicon",
                                        ]
                                        : typeof selection === "string"
                                        ? selection.split(",")
                                        : selection,
                                },
                            },
                        };
                    }
                }
            }
            return { ...data.input, body: { ...body, input: mapped } };
        },
    },
    output: { schema: zNativeOutput },
    timeouts: { requestMs: 240_000, runMs: 250_000 },
    lifecycle: { start: unlockerStart },
});
