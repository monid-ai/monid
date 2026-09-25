import { assertEquals } from "@std/assert";
import { runEndpoint, testSealedUnit } from "@shared/testing";

/**
 * Live-test helpers shared by the growsurf suites. Not a connector file:
 * the loader imports `provider.ts` and `endpoints/**\/endpoint.ts` only.
 *
 * WHY THIS EXISTS: a GrowSurf program id belongs to ONE team, so no id can
 * be pinned into a live test the way vaquill pins a public statute id.
 * Every program-scoped live test discovers one through
 * `growsurf#campaigns`, which is why that endpoint carries the only
 * input-free live test.
 */
export async function liveProgramId(
    type?: "REFERRAL" | "AFFILIATE",
): Promise<string | undefined> {
    const list = await runEndpoint({
        unit: await testSealedUnit("growsurf#campaigns"),
        input: {},
        mode: "live",
    });
    const campaigns =
        (list.output as { campaigns?: { id: string; type: string }[] })
            .campaigns ?? [];
    const match = type === undefined
        ? campaigns[0]
        : campaigns.find((c) => c.type === type);
    return match?.id;
}

/**
 * Plan and verification gates are ACCOUNT states, not connector faults: a
 * live key may sit on either side of them, and which side is a fact about
 * the tester's GrowSurf plan rather than about this code. Any OTHER
 * provider error is a real finding and fails the test.
 */
const ACCOUNT_STATES = [
    "PAID_PLAN_REQUIRED_ERROR",
    "PAYMENT_METHOD_REQUIRED_ERROR",
    "EMAIL_NOT_VERIFIED_ERROR",
];

export function assertLiveOk(result: {
    isProviderError: boolean;
    output: unknown;
    usage: unknown;
}): void {
    // FREE on every path, error or not
    assertEquals(result.usage, { credits: {}, evidence: {} });
    if (!result.isProviderError) return;
    const code = String((result.output as Record<string, unknown>).code);
    assertEquals(
        ACCOUNT_STATES.includes(code),
        true,
        `unexpected provider error: ${JSON.stringify(result.output)}`,
    );
}
