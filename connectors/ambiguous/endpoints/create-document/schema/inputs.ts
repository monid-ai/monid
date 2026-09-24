import { z } from "zod";

export const body = z.object({
    type: z.enum(["doc", "sheet", "slide"]),
    title: z.string().optional(),
    content: z.string().describe(
        "Document body. For type=doc, accepts Markdown (recommended) or a ProseMirror JSON string. HTML is tolerated best-effort: a tag the editor schema maps becomes its node or mark, so `<b>x</b>` stores `x` in bold. A tag it does not map is kept as literal text, attributes and closing tag verbatim, so `<display-slug>` survives a round trip. Styling and decorative wrappers are still dropped and are listed in `import_warnings` on the response. For type=sheet/slide, see the respective module's authoring format. To insert a native smart chip (the live-status chip the editor inserts), write `@{task:<task-uuid>}` in Markdown; `doc`, `sheet`, `slide`, `canvas` and `wiki_page` ids work the same way, and the chip takes the entity's title when you can read it. Wrap a token in backticks to keep it as text.",
    ).optional(),
    visibility: z.string().optional(),
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
}).strict();
