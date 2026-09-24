import { z } from "zod";

export const body = z.object({
    title: z.string().min(1).max(255).describe(
        "Task title. Required. Max 255 chars; trimmed before insert.",
    ),
    description: z.string().describe(
        "Markdown body. Rendered with the standard task-card markdown subset.",
    ).optional(),
    status: z.enum(["todo", "in_progress", "done", "cancelled", "blocked"])
        .describe(
            "Initial status. Defaults to `todo`. If `task_status_id` is also set, that takes precedence and `status` is overridden by the custom status's category.",
        ).optional(),
    task_status_id: z.string().uuid().describe(
        "Custom status ID; overrides `status` category.",
    ).optional(),
    priority: z.enum(["urgent", "high", "medium", "low"]).describe(
        "Defaults to `medium`.",
    ).optional(),
    assignee_id: z.string().uuid().describe(
        "User to assign the task to. Must be in the caller's workspace (403 otherwise). Omit for unassigned.",
    ).optional(),
    due_date: z.string().date().describe(
        "ISO 8601 date (YYYY-MM-DD). If unset and a `priority` is given, the SLA policy auto-sets a due date and stamps `due_date_source: 'sla'`.",
    ).optional(),
    start_date: z.string().date().describe(
        "ISO 8601 date (YYYY-MM-DD); with `due_date` defines a date range.",
    ).optional(),
    parent_task_id: z.string().uuid().describe(
        "Parent task for subtasks. Omit for top-level tasks.",
    ).optional(),
    project_id: z.string().uuid().optional(),
    contact_id: z.string().uuid().describe(
        "Link the task to a CRM contact; auto-logs a CRM activity row.",
    ).optional(),
    deal_id: z.string().uuid().describe("Link the task to a CRM deal.")
        .optional(),
    sort_order: z.number().describe("Drag-reorder weight. Lower sorts first.")
        .optional(),
    recurrence_rule: z.string().describe(
        "RFC 5545 RRULE string. When set, completing the task spawns the next occurrence.",
    ).optional(),
    estimate: z.number().int().describe(
        "Story-point estimate (typically 1, 2, 3, 5, 8, 13).",
    ).optional(),
    estimated_minutes: z.number().int().gt(0).describe(
        "Time-budget estimate in minutes.",
    ).optional(),
    custom_field_values: z.record(z.string(), z.unknown()).describe(
        "Per-task custom-field values keyed by `task_custom_fields.id`.",
    ).optional(),
    goal_id: z.string().uuid().nullable().describe(
        "Link the task to an OKR-style goal.",
    ).optional(),
    cycle_id: z.string().uuid().describe(
        "Sprint/cycle this task is scheduled in.",
    ).optional(),
    label_ids: z.array(z.string().uuid()).describe(
        "Labels to assign at create time. Each ID must reference a label in the caller's workspace (404 otherwise).",
    ).optional(),
    subscriber_ids: z.array(z.string().uuid()).describe(
        "Users to subscribe to the task at create time so they receive update notifications. Each must be a member of the caller's workspace; IDs outside the workspace are silently skipped. Use to link a bug reporter to the filed task.",
    ).optional(),
}).strict().describe(
    "Body of `POST /api/tasks`. Captures the union of fields any surface accepts.",
);
