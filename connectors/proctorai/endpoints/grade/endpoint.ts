import { defineEndpoint } from "@shared/core";
import {
    zProctoraiGradeBody,
    zProctoraiQuestion,
    zProctoraiSubQuestion,
} from "./schema/inputs.ts";

/**
 * POST /api/v1/grade — grade one student's answer sheet.
 *
 * `endpoint: "/grade"` names the id; `/api/v1` is the vendor's routing
 * prefix, not identity (D22). Usage falls back to the provider's PER_CALL
 * 0.4 gradings and its receipt-reading consolidate.
 */
const subQuestion = zProctoraiSubQuestion.extend({
    id: zProctoraiSubQuestion.shape.id.min(1).max(40),
    label: zProctoraiSubQuestion.shape.label.unwrap().min(1).max(10)
        .optional(),
    prompt: zProctoraiSubQuestion.shape.prompt.min(1).max(4000),
    maxMarks: zProctoraiSubQuestion.shape.maxMarks.positive().max(1000),
    expectedAnswer: zProctoraiSubQuestion.shape.expectedAnswer.unwrap()
        .max(8000).optional(),
});

const question = zProctoraiQuestion.extend({
    id: zProctoraiQuestion.shape.id.unwrap().min(1).max(40).optional(),
    prompt: zProctoraiQuestion.shape.prompt.min(1).max(4000),
    maxMarks: zProctoraiQuestion.shape.maxMarks.unwrap().positive()
        .max(1000).optional(),
    expectedAnswer: zProctoraiQuestion.shape.expectedAnswer.unwrap()
        .max(8000).optional(),
    options: zProctoraiQuestion.shape.options.unwrap().min(2).max(10)
        .optional(),
    subQuestions: subQuestion.array().min(1).max(20).optional(),
});

export default defineEndpoint({
    meta: {
        displayName: "Proctor AI Grade Answer Sheet",
        summary: "Mark a student's handwritten answer sheet against your " +
            "marking key.",
        description: "Grades one student's exam the way a careful " +
            "examiner would. Send the questions (with max marks and, " +
            "ideally, the expected answer or marking scheme) and the " +
            "answer sheet as page images; get back marks per question " +
            "and per sub-part with the reasoning for each mark, what the " +
            "student wrote, which page it was on, a 0–1 confidence, and " +
            "`needsReview` on anything a teacher should check, plus " +
            "totals, strengths, improvements and overall feedback. " +
            "Handwriting is read charitably and graded on content; " +
            "multiple-choice items are all-or-nothing; a question it " +
            "cannot find scores 0 and is flagged rather than guessed. " +
            "One call is one student, so send each sheet separately. " +
            "Typed answers work too, via `answers`.",
        docsUrl: "https://agent.proctorai.io/developers#grade",
        categories: ["education"],
        notes: [
            "Send `pages`, `answers`, or both. A body with neither is " +
            "rejected with a 400, at no charge.",
            "Up to 20 pages per sheet. The whole request must be under " +
            "4.5 MB, so pass photos as https URLs rather than inline " +
            "data URLs.",
            "Takes 20–90 seconds per sheet.",
            "Page URLs must be publicly reachable https images; a URL " +
            "that fails to download is a 422, at no charge.",
            "A 502 means the grader gave up; nothing is charged and it " +
            "is safe to retry.",
        ],
    },
    endpoint: "/grade",
    request: { method: "POST", path: "/api/v1/grade" },
    input: {
        schema: {
            body: zProctoraiGradeBody.extend({
                title: zProctoraiGradeBody.shape.title.unwrap().max(200)
                    .optional(),
                level: zProctoraiGradeBody.shape.level.unwrap().max(80)
                    .optional(),
                studentName: zProctoraiGradeBody.shape.studentName.unwrap()
                    .max(120).optional(),
                instructions: zProctoraiGradeBody.shape.instructions
                    .unwrap().max(2000).optional(),
                questions: question.array().min(1).max(100),
                pages: zProctoraiGradeBody.shape.pages.unwrap().min(1)
                    .max(20).optional(),
                answers: zProctoraiGradeBody.shape.answers.unwrap().min(1)
                    .max(500).optional(),
            }),
        },
    },
});
