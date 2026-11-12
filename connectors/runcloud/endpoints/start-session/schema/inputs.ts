import { z } from "zod";
import { zPlatform } from "../../../schema/common.ts";

/** `POST /run-cloud/{platform}` path parameters. */
export const zStartSessionPathParams = z.object({
    platform: zPlatform,
}).strict();

/**
 * `POST /run-cloud/{platform}` body, the subset of run-cloud/sdk
 * `CreateSessionOptions` this connector exposes. Vendor-faithful and
 * default-free; the short-session defaults live at the binding.
 */
export const zStartSessionBody = z.object({
    model: z.string().min(1).max(100).optional().describe(
        "Device family: 'iphone' (default) or 'ipad' on iOS, 'pixel' " +
            "(default) on Android.",
    ),
    installAssets: z.array(z.string().min(1)).max(10).optional().describe(
        "Up to 10 unique run.cloud asset ids (uploaded .app.zip/.apk " +
            "builds) to install when the session starts.",
    ),
    inactivityTimeout: z.string().regex(/^(\d+[smh]|none)$/).optional()
        .describe(
            "Close the session after this long without activity, e.g. " +
                "'60s', '5m', '1h', or 'none'.",
        ),
    hardTimeout: z.string().regex(/^\d+[smh]$/).optional().describe(
        "Maximum session lifetime, e.g. '10m' or '1h' (vendor maximum " +
            "195 minutes).",
    ),
}).strict();
