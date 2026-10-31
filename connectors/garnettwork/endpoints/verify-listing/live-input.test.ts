import { assertEquals, assertThrows } from "@std/assert";
import { liveListingInput } from "./live-input.ts";

Deno.test("live input: approved configuration is passed through, never manufactured", () => {
    for (
        const url of [
            "https://www.ebay.com/itm/111111111111",
            "https://ebay.com/itm/example/111111111111",
        ]
    ) {
        assertEquals(liveListingInput(url), { url, intent: "BUY" });
    }
});

Deno.test("live input: missing, synthetic placeholder and unsupported URL inputs fail before network", () => {
    for (
        const value of [
            undefined,
            "",
            "not-a-url",
            "https://www.ebay.com/itm/000000000000",
            "http://www.ebay.com/itm/111111111111",
            "https://www.ebay.ca/itm/111111111111",
            "https://www.ebay.com.evil.invalid/itm/111111111111",
            "https://user:password@www.ebay.com/itm/111111111111",
            "https://www.ebay.com:8443/itm/111111111111",
            "https://www.ebay.com/itm/not-an-item",
        ]
    ) {
        assertThrows(
            () => liveListingInput(value),
            Error,
            "GARNETTWORK_LIVE_LISTING_URL",
        );
    }
});
