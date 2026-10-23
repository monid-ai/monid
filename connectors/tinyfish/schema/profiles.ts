import { z } from "zod";

/**
 * Shared fragments for the Browser Context Profile family
 * (`/browser-profiles/*`) and the agent run's `profileId` attachment
 * (ported from monid-services `adaptors/tinyfish/endpoints/profiles-common.ts`).
 *
 * TENANCY: profiles are ACCOUNT-scoped at TinyFish and Monid holds one
 * account, so every profile operation is ownership-gated on the
 * workspace-owned `tinyfish/browser-profile` resource; `set_as_default` and
 * a bare `use_profile: true` (the ACCOUNT default profile — another
 * workspace's logins) are never sent.
 */

/** Vendor-documented proxy countries (profiles and agent runs). */
export const zProxyCountry = z.enum(["US", "GB", "CA", "DE", "FR", "JP", "AU"]);

/** The vendor profile id of a profile YOU OWN. */
export const zProfileId = z.string().min(1).describe(
    "The id of a browser profile YOU OWN (the resource's externalId, e.g. " +
        "'prof_abc123def4567890' — create one via " +
        "/browser-profiles/provision).",
);

/** A setup session id, as /browser-profiles/setup-session returns it. */
export const zSetupSessionId = z.string().min(1).describe(
    "The setup session_id returned by /browser-profiles/setup-session.",
);
