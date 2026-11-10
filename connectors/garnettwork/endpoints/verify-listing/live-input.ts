/** Live-test input only. No credentials, real listing IDs or network calls. */
export function liveListingInput(value: string | undefined) {
    const message =
        "Set GARNETTWORK_LIVE_LISTING_URL to an approved eBay US PS5 Disc Buy It Now listing before running the live test.";
    if (!value) throw new Error(message);
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        throw new Error(message);
    }
    const item = url.pathname.match(/^\/itm\/(?:[^/]+\/)?([0-9]{12})\/?$/);
    if (
        url.protocol !== "https:" ||
        !["www.ebay.com", "ebay.com"].includes(url.hostname) ||
        url.username || url.password || url.port ||
        !item || item[1] === "000000000000"
    ) {
        throw new Error(message);
    }
    // URL syntax is not proof of model, sale format, availability or eligibility.
    // The service still validates the supported scope and returns its verdict.
    return { url: value, intent: "BUY" as const };
}
