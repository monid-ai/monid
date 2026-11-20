import { zWorklittleDocumentBody } from "../../../schema/documents.ts";

/**
 * POST /v1/resumes body — the shared document fields as-is. jobs-api
 * `documentGeneration.ts` + `apiResumeWriter.ts` (reads resume_text,
 * profile, job_id, job_context, company, role, instructions, formats),
 * 2026-10-29.
 */
export const zResumesBody = zWorklittleDocumentBody;
