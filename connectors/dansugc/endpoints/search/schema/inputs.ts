import { z } from "zod";
import { zClipId } from "../../../schema/common.ts";

/** GET /broll query — the vendor mirror (dansugc.com/docs#tag/b-roll/GET/broll,
 *  2026-10-20). `search` and `semantic_search` are alternatives: keyword
 *  matching vs natural-language ranking. Filter values come from
 *  `dansugc#broll/filters`. */
export const zSearchQueryParams = z.object({
    search: z.string().min(1).optional(),
    semantic_search: z.string().min(1).optional(),
    emotion: z.string().optional(),
    gender: z.string().optional(),
    location: z.string().optional(),
    age_range: z.string().optional(),
    hair_color: z.string().optional(),
    outfit: z.string().optional(),
    model_id: zClipId.optional(),
    difficulty: z.number().int().min(0).optional(),
    min_difficulty: z.number().int().min(0).optional(),
    max_difficulty: z.number().int().min(0).optional(),
    is_daily_drop: z.boolean().optional(),
    media_type: z.enum(["video", "image"]).optional(),
    featured: z.boolean().optional(),
    min_virality: z.number().optional(),
    sort_by: z.enum([
        "created_at",
        "virality_score",
        "download_count",
        "difficulty_level",
    ]).optional(),
    sort_order: z.enum(["asc", "desc"]).optional(),
    page: z.number().int().min(1).optional(),
    limit: z.number().int().min(1).max(100).optional(),
}).strict();
