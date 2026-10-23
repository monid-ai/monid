import { defineEndpoint } from "@shared/core";
import { zSubmitRecipeBody } from "./schema/inputs.ts";

/** Agent Vault `POST /v1/recipes`. */
export default defineEndpoint({
    meta: {
        displayName: "Submit a Recipe",
        summary:
            "Submit a checkout or signup recipe to the Agent Vault registry " +
            "after a run.",
        description:
            "Sends what an agent learned about a merchant's checkout or a " +
            "site's signup flow to the Checkout Recipe Registry, so the next " +
            "agent on that site starts with a known path. The response " +
            "returns a submission ID, and screening runs after the request " +
            "completes. Check the result with GET " +
            "/v1/recipes/submissions/{id}. Only a maintainer can mark a " +
            "recipe verified, and an account can submit up to 20 recipes in a " +
            "rolling 24 hours. This endpoint does not make a purchase, and a " +
            "recipe should never contain card numbers, passwords or filled " +
            "values.",
        docsUrl: "https://docs.agentvault.io/reference/http-api",
        categories: ["agent-identity"],
        notes: [
            "The request body is limited to 64 KB, and an account can " +
            "submit 20 recipes in any rolling 24 hours.",
            "Returns 202 with a submission id and status `pending`; read " +
            "the verdict with GET /v1/recipes/submissions/{id}.",
        ],
    },
    /** GET /v1/recipes and POST /v1/recipes share one native path, so the
     *  public identity of the write is declared (design D22): it creates a
     *  submission, which GET /v1/recipes/submissions/{id} then reads. */
    endpoint: "/v1/recipes/submissions",
    request: { method: "POST", path: "/v1/recipes" },
    input: { schema: { body: zSubmitRecipeBody } },
});
