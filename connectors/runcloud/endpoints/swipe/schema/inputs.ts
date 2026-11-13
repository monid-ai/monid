import { z } from "zod";
import { zPoint } from "../../../schema/common.ts";

/** Interaction body for action `swipe` (run-cloud/sdk
 *  `SimulatorInteraction`, bounds from `SIMULATOR_INTERACTION_LIMITS`). */
export const zSwipeBody = z.object({
    from: zPoint.describe("Where the finger lands."),
    to: zPoint.describe("Where the finger lifts."),
    durationMs: z.number().int().min(50).max(30_000).optional().describe(
        "Swipe duration in milliseconds (50-30000, vendor default 300). " +
            "Slower swipes scroll less.",
    ),
}).strict();
