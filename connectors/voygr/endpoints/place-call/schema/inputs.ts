import { z } from "zod";

/** The terms a caller accepts before any call. A new version changes both. */
export const TERMS_VERSION = "20261023";
export const TERMS_TEXT =
    "I agree to the PlaceCall API Terms and Privacy Policy (version 2026-10-23)";

/** The elements of the call's opening sentence. Strict: VOYGR refuses an
 *  unknown key with 422 rather than ignoring it. */
const zDisclosure = z.strictObject({
    company_name: z.string().max(60).nullable().optional().describe(
        'Who is calling: "Hi, this is {company_name}". Default ' +
            '"PlaceCall". It must be your own business or one you are ' +
            "authorised to represent: the terms of service prohibit " +
            "impersonation.",
    ),
    on_behalf_of: z.string().max(80).nullable().optional().describe(
        'On whose behalf: "calling for {on_behalf_of}".',
    ),
    purpose: z.string().max(100).nullable().optional().describe(
        "Ends the sentence, for example \"to verify your practice's " +
            'directory information". One clause: no . ! ? or ;. Spoken ' +
            "exactly as sent, so write it in the call's language.",
    ),
    mention_ai: z.boolean().optional().describe(
        "Say the caller is an AI assistant: \"{company_name}'s AI " +
            'assistant". Default true; `false` drops it.',
    ),
    mention_recording: z.boolean().nullable().optional().describe(
        'Include "on a recorded line". Defaults to the value of ' +
            "`record_call`; `true` with `record_call: false` is refused.",
    ),
});

/**
 * `POST /calls` (VOYGR's CallCreateRequest) plus `accept_terms`, which is
 * checked here and never sent. `ask_user_mode` drops `webhook`: a Monid
 * workspace has no webhook registered with VOYGR. No defaults: VOYGR
 * applies its own, and a schema default would be written into the body.
 */
export const zPlaceCallBody = z.strictObject({
    accept_terms: z.enum([TERMS_TEXT]).describe(
        `Send exactly: "${TERMS_TEXT}". Terms: ` +
            "https://voygr.tech/terms-api. Privacy Policy: " +
            "https://voygr.tech/privacy-policy. The connector checks it " +
            "and does not send it to VOYGR.",
    ),
    target_phone: z.string().optional().describe(
        "The number to call, in E.164 (for example +14155550101). " +
            "Required with `brief`. A structured call puts it in " +
            "`slots.target_phone` instead.",
    ),
    brief: z.string().max(4000).nullable().optional().describe(
        "What the call should do, in plain language. Required unless you " +
            "send `slots`.",
    ),
    language: z.enum([
        "en",
        "es",
        "fr",
        "de",
        "hi",
        "ru",
        "pt",
        "ja",
        "it",
        "nl",
        "sr",
        "tr",
        "pl",
        "auto",
    ]).optional().describe(
        "The call's language: an ISO 639-1 code from the list, or `auto` " +
            "(the default).",
    ),
    intent: z.enum(["inquiry", "info_gathering", "issue_resolution", "booking"])
        .nullable().optional().describe(
            "Structured calls only, with `slots`. A `booking` call makes " +
                "the reservation by phone; no booking record is stored.",
        ),
    slots: z.record(z.string(), z.unknown()).nullable().optional().describe(
        "Structured calls only. Required per intent: inquiry needs " +
            "target_phone and question; info_gathering needs target_phone " +
            "and questions; issue_resolution needs target_phone and " +
            "issue_description; booking needs target_phone, name, date " +
            "(YYYY-MM-DD), time (HH:MM, 24-hour) and party_size. A missing " +
            "slot gets a 422 `missing_slots`, which lists what to ask for.",
    ),
    kind: z.enum([
        "restaurant_booking",
        "restaurant_cancel",
        "doctor_appointment",
        "hotel_booking",
        "concierge",
        "other",
    ]).optional().describe(
        "An optional category for a freeform call; `brief` defines the " +
            "task. Ignored for structured calls.",
    ),
    ask_user_mode: z.enum(["any", "stream"]).optional().describe(
        "`any` (the default) and `stream` behave the same. A question the " +
            "call asks shows in `pending_questions` on voygr#get-call.",
    ),
    disclosure: z.union([zDisclosure, z.literal(false)]).nullable().optional()
        .describe(
            "The sentence the call opens with. Left out: the default " +
                "sentence (\"Hi, this is PlaceCall's AI assistant, calling " +
                'for a client on a recorded line." in English). An object: ' +
                "the sentence is built from its elements (English and " +
                "Spanish calls only; a freeform call with `language: auto` " +
                "opens in English; at most 180 characters in all). `false`: " +
                "no opening notice; the agent opens with a short greeting " +
                "and your request and says who is calling only when asked, " +
                "and you must give every notice the law requires yourself.",
        ),
    record_call: z.boolean().nullable().optional().describe(
        "`false`: VOYGR does not record the audio, and the opening " +
            "sentence drops its recording clause. The transcript is still " +
            "kept. " +
            "Default true. Outside English and Spanish, `false` needs " +
            "`disclosure: false`.",
    ),
    voice: z.strictObject({
        gender: z.enum(["female", "male"]).nullable().optional(),
    }).nullable().optional().describe(
        'How the agent sounds, for example {"gender": "female"}. A ' +
            "preference only: it never fails the call.",
    ),
    suggestion_id: z.string().min(4).max(40).nullable().optional().describe(
        "Links the call to a card from voygr#suggest-places. Freeform " +
            "calls only. The card must be at most 7 days old and " +
            "`target_phone` must equal its `phone_e164`.",
    ),
});
