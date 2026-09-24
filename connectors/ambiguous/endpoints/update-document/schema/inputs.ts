import { z } from "zod";

export const body = z.object({
    title: z.string().optional(),
    content: z.string().describe(
        "Replacement document body. For type=doc, accepts Markdown (recommended) or a ProseMirror JSON string. HTML is tolerated best-effort: a mapped tag becomes its node or mark, an unmapped tag is kept as literal text, and styling and decorative wrappers are dropped and listed in `import_warnings` on the response. To insert a native smart chip (the live-status chip the editor inserts), write `@{task:<task-uuid>}` in Markdown; `doc`, `sheet`, `slide`, `canvas` and `wiki_page` ids work the same way, and the chip takes the entity's title when you can read it. Wrap a token in backticks to keep it as text. Mutually exclusive with `operations`.",
    ).optional(),
    labels: z.array(z.string()).optional(),
    page_style: z.object({
        margins: z.object({
            top: z.number().optional(),
            bottom: z.number().optional(),
            left: z.number().optional(),
            right: z.number().optional(),
            header: z.number().optional(),
            footer: z.number().optional(),
        }).strict().optional(),
        pageSize: z.union([
            z.object({
                width: z.number(),
                height: z.number(),
            }).strict(),
            z.enum(["letter", "A4", "legal"]),
        ]).optional(),
        orientation: z.enum(["portrait", "landscape"]).optional(),
        pageless: z.unknown().describe("Pageless (continuous) layout toggle.")
            .optional(),
        backgroundColor: z.unknown().describe(
            "Canvas background: `default`/`white`/`dark` preset or 6-digit hex.",
        ).optional(),
    }).strict().optional(),
    suggesting: z.boolean().describe(
        "Commenter-relaxed write: content changes must carry track-change marks (auto-wrapped for agents).",
    ).optional(),
    operations: z.array(
        z.object({
            type: z.enum(["replace", "insert_after"]),
            blockId: z.string(),
            content: z.string(),
        }).strict(),
    ).describe(
        "Block-id-targeted edits as an alternative to `content` replacement. `content` field on each op is Markdown that is converted to PM JSON and applied at the matched blockId; `@{task:<task-uuid>}` becomes a native smart chip.",
    ).optional(),
}).strict();

export const pathParams = z.object({
    id: z.string().uuid(),
}).strict();
