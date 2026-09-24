import { z } from "zod";

export const body = z.object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().nullable().optional(),
    status: z.enum(["todo", "in_progress", "done", "cancelled", "blocked"])
        .describe(
            "System task status category. Drives the built-in board columns.",
        ).optional(),
    task_status_id: z.string().uuid().nullable().optional(),
    priority: z.enum(["urgent", "high", "medium", "low"]).describe(
        "Task priority. Determines SLA timer and sort weight.",
    ).optional(),
    assignee_id: z.string().uuid().nullable().optional(),
    due_date: z.string().date().nullable().optional(),
    due_date_source: z.enum(["manual", "sla"]).describe(
        "Defaults to `manual` when `due_date` changes through this update. Set explicitly to `sla` to mark a system-set due date.",
    ).optional(),
    start_date: z.string().date().nullable().optional(),
    parent_task_id: z.string().uuid().nullable().optional(),
    project_id: z.string().uuid().nullable().optional(),
    contact_id: z.string().uuid().nullable().optional(),
    deal_id: z.string().uuid().nullable().optional(),
    sort_order: z.number().optional(),
    recurrence_rule: z.string().nullable().optional(),
    estimate: z.number().int().nullable().optional(),
    estimated_minutes: z.number().int().nullable().optional(),
    time_spent_minutes: z.number().int().nullable().describe(
        "Manual override; usually auto-managed by time entries.",
    ).optional(),
    custom_field_values: z.record(z.string(), z.unknown()).optional(),
    goal_id: z.string().uuid().nullable().optional(),
    cycle_id: z.string().uuid().nullable().optional(),
    subscriber_ids: z.array(z.string().uuid()).describe(
        "Users to subscribe to this task so they receive update notifications. Additive — existing subscribers are untouched. Each must be a workspace member; IDs outside the workspace are silently skipped. Use to backfill a bug reporter onto an existing task.",
    ).optional(),
}).strict().describe(
    "Body of `PATCH /api/tasks/:id`. All fields optional; `null` clears nullable fields.",
);

export const pathParams = z.object({
    id: z.string().uuid(),
}).strict();
