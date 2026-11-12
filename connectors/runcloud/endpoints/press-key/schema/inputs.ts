import { z } from "zod";
import { zPressDurationMs } from "../../../schema/common.ts";

/** run-cloud/sdk `SIMULATOR_KEYS`, verbatim (the server accepts exactly
 *  a-z, 0-9 and these named keys). */
const SIMULATOR_KEYS = [
    ..."abcdefghijklmnopqrstuvwxyz0123456789".split(""),
    "enter",
    "escape",
    "backspace",
    "tab",
    "space",
    "minus",
    "equal",
    "bracketLeft",
    "bracketRight",
    "backslash",
    "semicolon",
    "quote",
    "backquote",
    "comma",
    "period",
    "slash",
    "capsLock",
    "f1",
    "f2",
    "f3",
    "f4",
    "f5",
    "f6",
    "f7",
    "f8",
    "f9",
    "f10",
    "f11",
    "f12",
    "printScreen",
    "scrollLock",
    "pause",
    "insert",
    "home",
    "pageUp",
    "delete",
    "end",
    "pageDown",
    "arrowRight",
    "arrowLeft",
    "arrowDown",
    "arrowUp",
    "numLock",
    "numpadDivide",
    "numpadMultiply",
    "numpadSubtract",
    "numpadAdd",
    "numpadEnter",
    "numpad0",
    "numpad1",
    "numpad2",
    "numpad3",
    "numpad4",
    "numpad5",
    "numpad6",
    "numpad7",
    "numpad8",
    "numpad9",
    "numpadDecimal",
];

/** Interaction body for action `pressKey`. */
export const zPressKeyBody = z.object({
    key: z.enum(SIMULATOR_KEYS).describe(
        "Key to press: a letter or digit, or a named key such as enter, " +
            "backspace, escape, tab, arrowDown.",
    ),
    modifiers: z.array(z.enum(["shift", "control", "alt", "meta"])).max(4)
        .optional().describe(
            "Modifier keys to hold, each at most once (e.g. ['meta'] with " +
                "key 'a' selects all).",
        ),
    durationMs: zPressDurationMs.optional(),
}).strict();
