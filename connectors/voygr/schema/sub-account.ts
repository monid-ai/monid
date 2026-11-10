import type { EnsureFn } from "@shared/core";

/**
 * ONE VOYGR sub-account per Monid workspace.
 *
 * Monid calls VOYGR with a single partner key for every user, so the
 * partner key alone would pool every workspace's calls under one set of
 * limits and one usage report. VOYGR keeps users apart with sub-accounts:
 * a request carrying `X-Sub-Account: <id>` is limited and reported
 * against that sub-account. (Credits still draw on the partner balance.)
 * Every endpoint declares `resources: { uses: [SUB_ACCOUNT_BINDING] }`;
 * the provider relay (provider.ts) refuses to call VOYGR for a workspace
 * that does not own one.
 *
 * `ensure` runs before the first request of a workspace and is
 * idempotent twice over: it does nothing when the workspace already owns
 * the row, and VOYGR answers a repeated reference (`monid:<scope key>`)
 * with the existing sub-account (200) instead of a second one (201).
 * Any other answer throws, so no request goes out without an owner.
 *
 * Closed term: no imports, no captures, no annotations in the body.
 */
export const ensureSubAccount: EnsureFn = async ({ data, utils }) => {
    const owned = await utils.resources.owned({
        resource: "voygr/sub-account",
    });
    if (owned.length > 0) return [];
    const reference = "monid:" + data.scope.key;
    // utils.http, not utils.request: request() would run the endpoint's
    // own compiled call
    const res = await utils.http({
        method: "POST",
        path: "/v1/sub-accounts",
        body: { reference },
    });
    if (res.status !== 200 && res.status !== 201) {
        throw new Error(
            "voygr sub-account ensure failed with HTTP " + res.status,
        );
    }
    const id = utils.json.optionalStr(res.body, "$.id");
    if (id === undefined || id === "") {
        throw new Error("voygr sub-account ensure returned no sub-account id");
    }
    return [{
        resource: "voygr/sub-account",
        externalId: id,
        data: { reference },
    }];
};

/** The binding every VOYGR endpoint declares under `resources.uses`. */
export const SUB_ACCOUNT_BINDING = {
    id: "voygr/sub-account",
    ensure: ensureSubAccount,
};
