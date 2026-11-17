import { z } from "zod";

/**
 * call4me `POST /api/calls` request body — a faithful mirror of the
 * published OpenAPI schema (https://call4.me/api/openapi.json, v1.3.0):
 * optionality only, no defaults (D25). The vendor rejects unknown fields
 * (`additionalProperties: false`), so the mirror is strict. The binding in
 * endpoint.ts narrows it for pooled tenancy.
 */
export const zPlaceCallBody = z.strictObject({
    to: z.string().min(3).max(40).describe(
        'The number to call, e.g. "+14155550123", "(415) 555-0123", or ' +
            'abroad with its country code, e.g. "+31 20 123 4567".',
    ),
    business: z.string().min(1).max(120).describe(
        'Who is being called, as a person would say it: "Nopa", ' +
            '"Dr. Chen\'s office", "Toyota of Berkeley service".',
    ),
    goal: z.string().min(5).max(1500).describe(
        'What the call should achieve, in plain words: "Book a table for ' +
            '4 tomorrow (Sat Oct 3) around 7pm under Khami."',
    ),
    category: z.enum([
        "medical",
        "dental",
        "restaurant",
        "veterinary",
        "auto_service",
        "auto_sales",
        "home_service",
        "personal_care",
        "internet_new_service",
        "internet_existing_account",
        "flight_change",
        "general",
    ]).describe(
        "The kind of call; decides what must be known first (see " +
            "call4me#requirements/{category}).",
    ),
    details: z.record(z.string(), z.string().max(1000)).optional().describe(
        "Answers to the category's fields by key, e.g. " +
            '{"reason":"annual physical","patient_status":"existing",' +
            '"availability":"weekday mornings next week"}.',
    ),
    on_behalf_of: z.string().min(1).max(80).optional().describe(
        "Who the call is for, as the caller should say it. The caller " +
            "calls FOR this person; it never claims to be them.",
    ),
    facts: z.string().max(3000).optional().describe(
        "Anything else the caller may share beyond the category's fields, " +
            "one per line.",
    ),
    flexibility: z.string().max(1500).optional().describe(
        'What the caller may accept without asking: "any time 6:30-8pm", ' +
            '"a different day this week is fine", "up to $300".',
    ),
    timezone: z.string().max(60).optional().describe(
        'IANA time zone of the business, e.g. "America/Los_Angeles", so ' +
            '"tomorrow" is unambiguous.',
    ),
    connect_when: z.string().max(300).optional().describe(
        "When to ring the user and patch them into the call without being " +
            'asked, e.g. "as soon as a person picks up".',
    ),
    listen_in: z.boolean().optional().describe(
        "Ring the user as soon as the business answers so they can listen " +
            "in.",
    ),
    max_minutes: z.number().int().min(1).max(240).optional().describe(
        "Cap on the answered call, including phone menus. Only credits for " +
            "that cap are held. A call still on hold at the cap keeps " +
            "waiting (15 more minutes of credits at a time, up to 4 hours); " +
            "one mid-conversation gets 2 more minutes at a time to finish.",
    ),
    voice: z.enum(["marin", "cedar", "gleam", "meridian", "vesper", "willow"])
        .optional().describe(
            "Caller voice (default marin); hear each at " +
                "https://call4.me/voices.",
        ),
    caller_name: z.string().max(30).optional().describe(
        'A first name the caller introduces itself with, e.g. "Jordan", ' +
            "for this call only. Put the caller's name and company here, " +
            "never in the goal.",
    ),
    calling_as: z.string().min(1).max(80).optional().describe(
        'A company the caller calls from, e.g. "Acme": it introduces ' +
            'itself as "Jordan from Acme".',
    ),
    callback_number: z.string().max(40).optional().describe(
        "The number the caller gives for call-backs and on voicemail, when " +
            'the user wants callbacks to ring a phone of theirs (e.g. "(415) ' +
            '555-0123").',
    ),
    from: z.string().max(40).optional().describe(
        "Which of the account's numbers to call from.",
    ),
});
