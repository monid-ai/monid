import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFacebookPagesBody } from "./schema/inputs.ts";

/**
 * Mindcase `facebook/pages`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Facebook Pages",
        summary:
            "Public Facebook page profiles: category, followers, contact " +
            "details, rating, hours, owner, ad status, and links to " +
            "Instagram, X, YouTube and TikTok.",
        description:
            "Public Facebook page profiles: category, followers, contact " +
            "details, rating, hours, owner, ad status, and links to " +
            "Instagram, X, YouTube and TikTok. Returns one row per page " +
            "with pageName, username, pageUrl, pageId, category, intro, " +
            "pageCreated, followers, likes, following, talkingAbout, " +
            "wereHere, phone, email, website, otherWebsites, address, " +
            "addressMapUrl, recommendPercent, reviewCount, priceRange, " +
            "businessHours, services, confirmedOwner, runningAds, " +
            "adLibraryId, profilePictureUrl, coverPhotoUrl, " +
            "profilePhotoLink, socialLinks and 1 more fields. Give the " +
            "Facebook pages you want to profile, as handles or URLs, one " +
            "per line. For the page's posts use mindcase#facebook/posts; " +
            "for its reviews use mindcase#facebook/reviews; for its ads " +
            "use mindcase#facebook/ads. $0.01 per page; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/facebook/pages",
        categories: ["facebook"],
    },
    endpoint: "/facebook/pages",
    request: { method: "POST", path: "/v1/data/facebook/pages/run" },
    input: {
        schema: {
            body: zFacebookPagesBody,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.01 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.pageUrls.length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
