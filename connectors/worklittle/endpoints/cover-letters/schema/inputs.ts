import { zWorklittleDocumentBody } from "../../../schema/documents.ts";

/**
 * POST /v1/cover-letters body — the shared document fields as-is. jobs-api
 * `documentGeneration.ts` + the `create_cover_letter` tool schema (same
 * fields as a resume), 2026-10-29.
 */
export const zCoverLettersBody = zWorklittleDocumentBody;
