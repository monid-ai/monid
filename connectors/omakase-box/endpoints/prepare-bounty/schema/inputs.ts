import { z } from "zod";

export const zPrepareBody = z.strictObject({
    repository: z.string().regex(
        /^[A-Za-z\d-]{1,39}\/[A-Za-z\d._-]{1,100}$/,
    ).describe("Public owner/name repository you own or can write to."),
    commit: z.string().regex(/^[a-f\d]{40}$/).describe(
        "Exact commit to push, as 40 lowercase hexadecimal characters.",
    ),
    title: z.string().max(256).regex(/\S/).regex(/^[^\r\n]*$/).describe(
        "Nonblank single-line bounty title; the rendered title also includes the bounty id and must fit 256 characters.",
    ),
    task: z.string().regex(/\S/).describe("Nonblank task text for the issue."),
    note: z.string().optional().describe("Optional authored public note."),
    reward: z.number().int().min(1).max(100000).describe(
        "Reward in whole USD, 1–100000 inclusive; use the same reward when importing.",
    ),
    paths: z.array(
        z.string().min(1).max(1024).regex(
            /^(?![A-Za-z]:)(?!.*[\\\x00-\x1f\x7f])[^/]+(?:\/[^/]+)*$/,
        ).regex(/^(?!\.{1,2}(?:\/|$))(?!.*\/\.{1,2}(?:\/|$)).+$/),
    ).max(2000).describe(
        "Every tip-tree path plus every path touched by commits not on the remote default branch, including deleted and merge-side paths. Use repository-relative forward-slash paths without empty, dot or parent segments. The board refuses never-ship matches.",
    ),
    boxignore: z.string().optional().describe(
        "Optional root .boxignore contents, not a filename; removal-only patterns, no negation. The board re-reads the pushed root file on import.",
    ),
});
