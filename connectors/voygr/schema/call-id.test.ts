import { assertEquals } from "@std/assert";
import { zCallPathParams } from "./call-id.ts";

Deno.test("call-id: a call id is accepted", () => {
    assertEquals(
        zCallPathParams.safeParse({ call_id: "c_abc123" }).success,
        true,
    );
});

Deno.test("call-id: missing, empty, non-text and extra keys are refused", () => {
    for (
        const input of [
            {},
            { call_id: "" },
            { call_id: 7 },
            { call_id: null },
            { callid: "c_1" },
            { call_id: "c_1", extra: true },
        ]
    ) {
        assertEquals(
            zCallPathParams.safeParse(input).success,
            false,
            JSON.stringify(input),
        );
    }
});

Deno.test("call-id: describes call_id for the caller", () => {
    const description = zCallPathParams.shape.call_id.description ?? "";
    assertEquals(description.includes("voygr#place-call"), true);
});
