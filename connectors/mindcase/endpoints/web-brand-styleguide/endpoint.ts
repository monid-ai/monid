import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zWebBrandStyleguideBody } from "./schema/inputs.ts";

/**
 * Mindcase `web/brand-styleguide`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Web Brand Styleguide",
        summary: "A website's brand style guide, with site name, title, " +
            "description, language and the colors, fonts and logos it " +
            "uses. Pass the URLs.",
        description: "A website's brand style guide, with site name, title, " +
            "description, language and the colors, fonts and logos it " +
            "uses. Pass the URLs. Returns one row per style guide with " +
            "url, inputUrl, domain, siteName, title, description, " +
            "language, logoUrl, logoSvg, logoCandidates, faviconUrl, " +
            "appleTouchIconUrl, ogImageUrl, primaryColor, secondaryColor, " +
            "accentColor, themeColor, brandColors, neutralColors, " +
            "declaredColors, colorTokens, headingFont, bodyFont, " +
            "headingFontSource, bodyFontSource, fonts, customFonts, " +
            "googleFonts, usesAdobeFonts, fontFaces and 2 more fields. " +
            "For the page content use mindcase#web/scrape; for what the " +
            "site says about the company use " +
            "mindcase#leads/company-research. $0.0035 per style guide; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/web/brand-styleguide",
        categories: ["web-extraction"],
    },
    endpoint: "/web/brand-styleguide",
    request: { method: "POST", path: "/v1/data/web/brand-styleguide/run" },
    input: {
        schema: {
            body: zWebBrandStyleguideBody,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0035 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.urls.length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
