import { z } from "zod";

export const queryParams = z.object({
    assignee_id: z.string().describe(
        "Filter to tasks assigned to this user. `unassigned` to filter to unassigned.",
    ).optional(),
    creator_id: z.string().describe("Filter by creator user ID.").optional(),
    status: z.string().describe(
        "Filter by system status. Comma-separated for multi-select.",
    ).optional(),
    task_status_id: z.string().describe("Filter by custom status ID.")
        .optional(),
    exclude_task_status_ids: z.string().describe(
        "Comma-separated custom status IDs to exclude.",
    ).optional(),
    priority: z.string().optional(),
    project_id: z.string().optional(),
    parent_task_id: z.string().describe(
        "Filter by parent task ID. Special value `null` (string) returns top-level tasks only.",
    ).optional(),
    due_date_start: z.string().describe("YYYY-MM-DD lower bound (inclusive).")
        .optional(),
    due_date_end: z.string().describe("YYYY-MM-DD upper bound (inclusive).")
        .optional(),
    has_due_date: z.enum(["true", "false"]).describe(
        "Pass 'true' to filter to tasks with a due date set.",
    ).optional(),
    start_date_from: z.string().optional(),
    start_date_to: z.string().optional(),
    q: z.string().describe("Free-text search across title + description.")
        .optional(),
    completed_min: z.string().describe(
        "ISO 8601 lower bound on `completed_at`.",
    ).optional(),
    completed_max: z.string().describe(
        "ISO 8601 upper bound on `completed_at`.",
    ).optional(),
    updated_min: z.string().describe("ISO 8601 lower bound on `updated_at`.")
        .optional(),
    cycle_id: z.string().describe(
        "Filter by cycle ID. `none` returns tasks with no cycle.",
    ).optional(),
    label_id: z.string().describe(
        "Filter by a single label ID (must be a UUID).",
    ).optional(),
    label_ids: z.string().describe("Comma-separated label IDs (AND match).")
        .optional(),
    any_label_ids: z.string().describe("Comma-separated label IDs (OR match).")
        .optional(),
    contact_id: z.string().describe(
        "Filter to tasks linked to this CRM contact.",
    ).optional(),
    deal_id: z.string().describe("Filter to tasks linked to this CRM deal.")
        .optional(),
    crm_linked: z.enum(["true", "false"]).describe(
        "Pass 'true' to return tasks linked to a CRM contact or deal.",
    ).optional(),
    subscribed: z.string().describe(
        "Pass 'me' to filter to tasks the caller is subscribed to.",
    ).optional(),
    managed_coworkers: z.string().describe(
        "Pass 'true' to filter to tasks assigned to AI coworkers managed by the caller.",
    ).optional(),
    coworkers: z.string().describe(
        "Pass 'true' to filter to tasks assigned to AI coworkers in the caller's workspace.",
    ).optional(),
    show_archived: z.enum(["true", "false"]).describe(
        "Pass 'true' to include archived tasks (default: hidden).",
    ).optional(),
    untriaged: z.enum(["true", "false"]).describe(
        "Pass 'true' to filter to tasks with no project_id.",
    ).optional(),
    hide_blocked: z.enum(["true", "false"]).describe(
        "Pass 'true' to filter out tasks blocked via task_relations.",
    ).optional(),
    sort: z.enum([
        "updated_at",
        "sort_order",
        "created_at",
        "due_date",
        "priority",
    ]).describe(
        "Sort order for `GET /api/tasks`. `updated_at` (recently-touched first) is the default; `sort_order` for board / drag-reorder; `created_at` for chronology; `due_date` for deadline proximity; `priority` for urgency ranking.",
    ).optional(),
    cursor: z.string().describe("Opaque cursor from a prior `next_cursor`.")
        .optional(),
    limit: z.number().int().min(1).max(200).optional(),
    max_results: z.number().int().min(1).describe("Alias for `limit`.")
        .optional(),
    offset: z.number().int().min(0).nullable().describe(
        "Offset-based pagination fallback.",
    ).optional(),
    fields: z.string().optional(),
    notify: z.string().optional(),
}).strict();
