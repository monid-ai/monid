import { defineEndpoint } from "@shared/core";
import { z } from "zod";
import { zRecipesQueryParams } from "./schema/inputs.ts";

/** Agent Vault `GET /v1/recipes`. */
export default defineEndpoint({
    meta: {
        displayName: "Look Up Recipes",
        summary:
            "Look up what's already known about a merchant's checkout or " +
            "signup flow before your agent starts.",
        description:
            "Searches the Checkout Recipe Registry, an open registry that " +
            "records how real merchant checkouts and site signups work, so an " +
            "agent can follow a known path instead of improvising. Pass a " +
            "page URL to get the recipes that apply to it, each marked " +
            "verified, partial, unverified or dead-end. Send only the scheme, " +
            "host and path, and never a raw hosted-checkout URL, since those " +
            "can carry a session token. It returns instructions only and does " +
            "not open a page, fill a form or make a payment. To share what " +
            "your agent learned after a run, use POST /v1/recipes.",
        docsUrl: "https://docs.agentvault.io/reference/http-api",
        categories: ["agent-identity"],
        notes: [
            "Public lookup: the registry needs no API key, so none is " +
            "sent.",
            "Never send a raw hosted-checkout URL (Stripe `cs_...` or " +
            "Shopify `/checkouts/...` paths); they carry session tokens.",
            "With `url`, the response has four slots, each a recipe or " +
            "null: `merchant`, `platform`, `signup`, `signupPlatform`. " +
            "Without it, the index (or every recipe with `full=1`).",
        ],
    },
    request: { method: "GET", path: "/v1/recipes" },
    /** Public lookup: the key is optional and is never sent. */
    auth: {
        credentials: z.object({ apiKey: z.string().min(1).optional() }),
        inject: ({ data }) => data.request,
    },
    input: { schema: { queryParams: zRecipesQueryParams } },
});
