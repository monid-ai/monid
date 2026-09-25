import { z } from "zod";

/**
 * Provider-shared fragments — the request pieces two or more GrowSurf
 * endpoints spell identically. Mirrors of the published parameters
 * (`CampaignId`, `ParticipantIdOrEmail`, `NextId`, `Limit100`), optionality
 * only.
 */

/** `{id}` — every program-scoped path carries it. */
export const zCampaignPathParams = z.object({
    id: z.string().min(1).describe(
        "GrowSurf program id — the short dashboard id, listed by " +
            "growsurf#campaigns. Example: cmng32.",
    ),
});

/** `{id}/{participantIdOrEmail}` — the four participant-scoped paths. */
export const zParticipantPathParams = z.object({
    ...zCampaignPathParams.shape,
    participantIdOrEmail: z.string().min(1).describe(
        "GrowSurf participant id or the participant's email address. " +
            "Either form resolves. Example: f8g9nl, or gavin@hooli.com.",
    ),
});

/**
 * Cursor paging, shared by the two participant list endpoints.
 *
 * `nextId` is an OPAQUE participant id the previous page returned as its
 * own `nextId`, and a page whose `nextId` is null is the last one. It is a
 * plain id rather than a signed cursor, so it is usable by the caller.
 */
export const zPagingQueryParams = z.object({
    nextId: z.string().min(1).optional().describe(
        "Participant id to start the next page at — the `nextId` the " +
            "previous page returned. Omit for the first page; stop when a " +
            "page returns `nextId: null`.",
    ),
    limit: z.number().int().min(1).max(100).optional().describe(
        "How many participants to return, 1-100. Defaults to 10.",
    ),
});
