import { z } from "zod";

/**
 * `POST /v1/extract` body — OpenAPI `ExtractRequest`
 * (docs.lev8.com/openapi.yaml, 2026-10-16). STRICT, as Lev8's is. Mirror
 * carries optionality only (D25); the `limit` default lives at the binding.
 */
export const zLev8ExtractBody = z.strictObject({
    type: z.enum([
        "x_followers",
        "x_following",
        "github_user_followers",
        "github_user_following",
        "github_repo_stargazers",
        "github_repo_contributors",
        "ins_followers",
        "ins_following",
        "tiktok_followers",
        "tiktok_following",
        "web2list",
    ]).describe(
        "What to extract. `x_*`, `ins_*`, `tiktok_*` and " +
            "`github_user_*` take a username; `github_repo_*` take " +
            "`owner/repo` or a repository URL; `web2list` extracts a " +
            "structured list from a public web page URL.",
    ),
    target: z.string().min(1).max(2048).describe(
        "Username (e.g. `sama`), GitHub repository (`openai/openai-python` " +
            "or its URL), or, for `web2list`, a public http(s) page URL.",
    ),
    instruction: z.string().max(4000).nullable().describe(
        "Required for `web2list`: which list items and fields to extract " +
            "from the page, up to 4,000 characters. Ignored otherwise.",
    ).optional(),
    limit: z.number().int().min(1).max(10000).describe(
        "Maximum number of social or GitHub results, 1 to 10,000. " +
            "`web2list` ignores it.",
    ).optional(),
});
