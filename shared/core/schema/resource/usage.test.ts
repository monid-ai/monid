import { assertEquals } from "@std/assert";
import { zUsageWindow } from "./usage.ts";

const WINDOW = {
    startIso: "2026-02-01T00:00:00Z",
    endIso: "2026-02-15T00:00:00Z",
    periodEndIso: "2026-03-01T00:00:00Z",
};

Deno.test("usage window: full period end is required and independent of the cutoff", () => {
    assertEquals(zUsageWindow.parse(WINDOW), WINDOW);
    for (
        const endIso of [
            WINDOW.startIso,
            WINDOW.periodEndIso,
            "2026-03-02T00:00:00Z",
        ]
    ) {
        assertEquals(
            zUsageWindow.safeParse({ ...WINDOW, endIso }).success,
            true,
        );
    }
    const { periodEndIso: _, ...oldWindow } = WINDOW;
    assertEquals(zUsageWindow.safeParse(oldWindow).success, false);
});

Deno.test("usage window: invalid or backwards timestamps cannot reach a meter", () => {
    for (
        const patch of [
            { periodEndIso: WINDOW.startIso },
            { periodEndIso: "2026-01-31T00:00:00Z" },
            { endIso: "2026-01-31T23:59:59Z" },
            { endIso: "2026-02-30T00:00:00Z" },
            { periodEndIso: "not-a-date" },
            { startIso: "2026-02-01" },
        ]
    ) {
        assertEquals(
            zUsageWindow.safeParse({ ...WINDOW, ...patch }).success,
            false,
        );
    }
});
