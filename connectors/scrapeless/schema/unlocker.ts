import { z } from "zod";
import { zHttpUrl } from "./common.ts";

const zInstruction = z.union([
    z.strictObject({ wait: z.number().int().nonnegative() }),
    z.strictObject({
        waitFor: z.tuple([z.string(), z.number().int().nonnegative()]),
    }),
    z.strictObject({
        click: z.tuple([z.string(), z.number().int().nonnegative()]),
    }),
    z.strictObject({ fill: z.tuple([z.string(), z.string()]) }),
    z.strictObject({ check: z.string() }),
    z.strictObject({ uncheck: z.string() }),
    z.strictObject({ evaluate: z.string() }),
    z.strictObject({
        keyboard: z.union([
            z.tuple([z.literal("press"), z.string()]),
            z.tuple([z.literal("down"), z.string()]),
            z.tuple([z.literal("up"), z.string()]),
            z.tuple([z.literal("type"), z.string()]),
            z.tuple([z.literal("type"), z.string(), z.number().nonnegative()]),
        ]),
    }),
]);
const zSelector = z.strictObject({ selector: z.string().optional() });
const zResponse = z.union([
    z.strictObject({
        type: z.enum(["html", "plaintext", "markdown"]),
        options: zSelector.optional(),
    }),
    z.strictObject({
        type: z.enum(["png", "jpeg"]),
        options: zSelector.extend({ fullPage: z.boolean().optional() })
            .optional(),
    }),
    z.strictObject({
        type: z.literal("network"),
        options: z.strictObject({
            urls: z.array(z.string()).optional().describe(
                "Official examples use URL fragments such as /example. A 2026-10-23 fragment probe returned the selected URL; glob semantics are not established.",
            ),
            status: z.union([z.array(z.string()), z.array(z.number().int())])
                .optional().describe(
                    "OpenAPI string[] or SDK/Docs number[], forwarded without coercion. Numeric [200] passed a representative 2026-10-23 network probe; string status filters are not live validated.",
                ),
            methods: z.array(z.string()).optional().describe(
                "Official example uses lowercase get; that spelling returned expected fetch data in the 2026-10-23 probe. Full case/filter exclusion behavior is not established.",
            ),
        }).optional(),
    }),
    z.strictObject({
        type: z.literal("content"),
        options: z.strictObject({
            selector: z.string().optional(),
            outputs: z.union([
                z.literal(""),
                z.string().regex(
                    /^(phone_numbers|headings|images|audios|videos|links|menus|hashtags|emails|metadata|tables|favicon)(,(phone_numbers|headings|images|audios|videos|links|menus|hashtags|emails|metadata|tables|favicon))*$/,
                ),
                z.array(
                    z.enum([
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
                    ]),
                ),
            ]).optional().describe(
                "Accept CSV or array. Nonempty CSV becomes an array. Per the guide, empty/omitted selects all: the binding sends the explicit twelve-output list validated on 2026-10-23, because raw empty forms returned errors or HTML. This is one pre-submit normalization, never a paid retry. Native upstream empty-form behavior remains anomalous.",
            ),
        }).optional(),
    }),
]);
export const zUnlockerInput = z.strictObject({
    url: zHttpUrl,
    method: z.string().optional().describe(
        "Target method; documented default GET. POST/body semantics remain supplier-confirmation items.",
    ),
    redirect: z.boolean().optional(),
    headers: z.record(z.string(), z.string()).optional().describe(
        "Local alias. Live probing found headers was not forwarded to the target; the binding maps this to the verified header wire field.",
    ),
    header: z.record(z.string(), z.string()).optional().describe(
        "Live-verified wire spelling: target echoed the custom header. Mutually exclusive with the headers alias.",
    ),
    cookies: z.array(z.strictObject({
        domain: z.string(),
        path: z.string(),
        name: z.string(),
        value: z.string(),
        expires: z.number().int().optional(),
        sameSite: z.string().optional(),
        secure: z.boolean().optional(),
    })).optional(),
    jsRender: z.strictObject({
        enabled: z.boolean().optional(),
        headless: z.boolean().optional(),
        waitUntil: z.enum([
            "load",
            "domcontentloaded",
            "networkidle2",
            "networkidle0",
        ]).optional(),
        instructions: z.array(zInstruction).optional(),
        block: z.strictObject({
            resources: z.array(
                z.enum([
                    "Document",
                    "Stylesheet",
                    "Image",
                    "Media",
                    "Font",
                    "Script",
                    "TextTrack",
                    "XHR",
                    "Fetch",
                    "Prefetch",
                    "EventSource",
                    "WebSocket",
                    "Manifest",
                    "SignedExchange",
                    "Ping",
                    "CSPViolationReport",
                    "Preflight",
                    "Other",
                ]),
            ).optional(),
            urls: z.array(z.string()).optional(),
        }).optional(),
        response: zResponse.optional(),
    }).optional(),
});
export const zUnlockerBody = z.strictObject({
    actor: z.literal("unlocker.webunlocker").default("unlocker.webunlocker"),
    input: z.union([
        zUnlockerInput.omit({ header: true }),
        zUnlockerInput.omit({ headers: true }),
    ]),
    proxy: z.strictObject({
        country: z.string().optional(),
        url: z.union([zHttpUrl, z.literal("")]).optional(),
    }).optional(),
});
