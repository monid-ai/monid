import { z } from "zod";

/**
 * Shared zod pieces for runcloud endpoint inputs. Every session route is
 * `/run-cloud/{platform}/{sessionId}/...` (run-cloud/sdk `SimulatorClient`),
 * so the platform and the session id are path parameters on every
 * session-scoped endpoint.
 */

export const zPlatform = z.enum(["ios", "android"]).describe(
    "ios for an iPhone/iPad simulator, android for an Android emulator.",
);

/** Path params of every session-scoped route. */
export const zSessionPathParams = z.object({
    platform: zPlatform.describe(
        "The session's platform, exactly as /start-session returned it.",
    ),
    sessionId: z.string().min(1).max(200).describe(
        "The session `id` returned by /start-session (a session YOU OWN).",
    ),
}).strict();

/** A normalized screen point (run-cloud/sdk `SimulatorPoint`). */
export const zPoint = z.object({
    x: z.number().min(0).max(1).describe(
        "Horizontal position, 0 = left edge, 1 = right edge.",
    ),
    y: z.number().min(0).max(1).describe(
        "Vertical position, 0 = top edge, 1 = bottom edge.",
    ),
}).strict();

/** Hold duration for keys and buttons
 *  (`SIMULATOR_INTERACTION_LIMITS.pressDurationMs`). */
export const zPressDurationMs = z.number().int().min(20).max(30_000).describe(
    "How long to hold it, in milliseconds (20-30000, vendor default 50).",
);
