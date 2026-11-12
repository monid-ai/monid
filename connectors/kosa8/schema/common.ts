import { z } from "zod";

/**
 * Shared kosa8 fragments. Every constraint mirrors the worker's own
 * validation (workers/cloud-api/src): route ids match
 * `([A-Za-z0-9_]{1,64})` (index.js), template and region keys match
 * TEMPLATE_RE / REGION_RE (util.js).
 */

/** A sandbox id as the routes accept it (`sbx_…` in practice). */
export const zSandboxId = z.string().regex(/^[A-Za-z0-9_]{1,64}$/);

/** The `{id}` path parameter of every sandbox-scoped route. */
export const zSandboxPathParams = z.object({
    id: zSandboxId.describe(
        "The id of a sandbox YOU created (from /create-sandbox), e.g. " +
            '"sbx_4fQm9TzR2kLw8VbN1cXyPa".',
    ),
}).strict();

/** A template key (base, python, node). */
export const zTemplateKey = z.string().regex(/^[a-z0-9][a-z0-9-]{0,31}$/);

/** A region id (eu-hel1). */
export const zRegionId = z.string().regex(/^[a-z0-9][a-z0-9-]{0,31}$/);
