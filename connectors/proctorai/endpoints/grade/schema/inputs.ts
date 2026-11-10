import { z } from "zod";

/**
 * POST /api/v1/grade body — mirrors Proctor AI's request schema
 * (agent.proctorai.io/developers, 2026-10-20). Optionality only (D25);
 * the vendor's bounds are applied at the binding in endpoint.ts.
 * Proctor AI rejects unknown keys, so every object is strict.
 */
const zId = z.string().regex(/^[A-Za-z0-9._-]+$/);

export const zProctoraiSubQuestion = z.object({
    id: zId.describe("Part id, unique within its question, e.g. 'a'."),
    label: z.string().describe(
        "How the paper prints the part, e.g. 'a' or 'ii'. Defaults to " +
            "a, b, c… in order.",
    ).optional(),
    prompt: z.string().describe("The part's question text."),
    maxMarks: z.number().describe("Marks this part is worth."),
    expectedAnswer: z.string().describe(
        "Model answer or marking scheme for this part.",
    ).optional(),
}).strict();

export const zProctoraiQuestion = z.object({
    id: zId.describe(
        "Question id, echoed back as `questionId`. Defaults to its " +
            "position: '1', '2', …",
    ).optional(),
    prompt: z.string().describe("The question as printed on the paper."),
    maxMarks: z.number().describe(
        "Marks the question is worth. If omitted, the grader reads it " +
            "off the paper or picks a sensible max and flags the row for " +
            "review. Ignored when `subQuestions` is set (their sum is " +
            "used).",
    ).optional(),
    expectedAnswer: z.string().describe(
        "Model answer or marking scheme, e.g. 'V = IR (1); states " +
            "constant temperature (1)'. If omitted, the grader solves the " +
            "question itself and lowers its confidence on open questions.",
    ).optional(),
    options: z.array(z.string()).describe(
        "Choices for a multiple-choice question. MCQs are marked " +
            "all-or-nothing.",
    ).optional(),
    subQuestions: z.array(zProctoraiSubQuestion).describe(
        "Parts (a), (b)… — each is marked and returned separately.",
    ).optional(),
}).strict();

export const zProctoraiTypedAnswer = z.object({
    questionId: zId.describe("Id of the question this answers."),
    subQuestionId: zId.describe("Id of the part, for sub-questions.")
        .optional(),
    text: z.string().describe("The student's typed answer."),
}).strict();

export const zProctoraiGradeBody = z.object({
    title: z.string().describe(
        "Exam or assignment title. Helps the grader pick subject " +
            "conventions (e.g. 'Class 10 Physics Unit Test 4').",
    ).optional(),
    level: z.string().describe("Class or level, e.g. 'Grade 10'.")
        .optional(),
    studentName: z.string().describe(
        "Student's name. When omitted it is read off the cover page.",
    ).optional(),
    instructions: z.string().describe(
        "Extra marking guidance in plain words, e.g. 'ignore spelling', " +
            "'award method marks generously'.",
    ).optional(),
    questions: z.array(zProctoraiQuestion).describe(
        "The marking key, in paper order.",
    ),
    pages: z.array(z.string()).describe(
        "The answer sheet, page by page in order: public https URLs of " +
            "JPEG, PNG, WebP or HEIC images (10 MB each), or " +
            "data:image/...;base64 URLs. Answers are found by the " +
            "student's own question numbers on any page.",
    ).optional(),
    answers: z.array(zProctoraiTypedAnswer).describe(
        "Typed answers, instead of or as well as `pages`.",
    ).optional(),
}).strict();
