import { z } from "zod";
import { zPressDurationMs } from "../../../schema/common.ts";

/** Interaction body for action `pressButton` (run-cloud/sdk
 *  `SIMULATOR_BUTTONS`, verbatim). */
export const zPressButtonBody = z.object({
    button: z.enum([
        "home",
        "back",
        "appSwitcher",
        "recents",
        "power",
        "volumeUp",
        "volumeDown",
        "menu",
        "sideButton",
        "actionButton",
        "digitalCrown",
    ]).describe(
        "Device button: home, back (Android), appSwitcher, recents, power, " +
            "volumeUp, volumeDown, menu, sideButton, actionButton, " +
            "digitalCrown.",
    ),
    durationMs: zPressDurationMs.optional(),
}).strict();
