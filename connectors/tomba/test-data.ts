import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { RunInput } from "@shared/core";
import {
    estimateEndpoint,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

/**
 * Shared test inputs for the Tomba connector — ONE table the endpoint
 * tests, the provider rate table, and the synthetic fixtures' recorded
 * URLs all read, so an input and its replay URL can never drift apart.
 * Values follow docs.tomba.io's own examples (stripe.com, Jane Doe —
 * placeholder identities).
 */
export const INPUTS = {
    "tomba#domain-search": {
        happy: { queryParams: { domain: "stripe.com", limit: 10 } },
        miss: { queryParams: { domain: "gmail.com", limit: 10 } },
        phones: {
            queryParams: {
                domain: "stripe.com",
                limit: 20,
                enrich_mobile: true,
            },
        },
    },
    "tomba#email-finder": {
        happy: {
            queryParams: {
                domain: "stripe.com",
                first_name: "Jane",
                last_name: "Doe",
            },
        },
        miss: {
            queryParams: {
                domain: "stripe.com",
                first_name: "John",
                last_name: "Roe",
            },
        },
        unknown: {
            queryParams: { company: "Stripe", full_name: "Jane Doe" },
        },
        phones: {
            queryParams: {
                domain: "stripe.com",
                full_name: "Jane Doe",
                enrich_mobile: true,
            },
        },
    },
    "tomba#author-finder": {
        happy: {
            queryParams: {
                url: "https://stripe.com/blog/online-payments-guide",
            },
        },
        miss: { queryParams: { url: "https://stripe.com/blog/unsigned" } },
    },
    "tomba#linkedin": {
        happy: {
            queryParams: { url: "https://www.linkedin.com/in/jane-doe" },
        },
        miss: {
            queryParams: { url: "https://www.linkedin.com/in/john-roe" },
        },
        full: {
            queryParams: {
                url: "https://www.linkedin.com/in/jane-doe",
                full: true,
            },
        },
    },
    "tomba#email-count": {
        happy: { queryParams: { domain: "stripe.com" } },
    },
    "tomba#email-format": {
        happy: { queryParams: { domain: "stripe.com" } },
    },
    "tomba#email-sources": {
        happy: { queryParams: { email: "jane.doe@stripe.com" } },
        miss: { queryParams: { email: "john.roe@stripe.com" } },
    },
    "tomba#email-verifier": {
        happy: { queryParams: { email: "jane.doe@stripe.com" } },
        miss: { queryParams: { email: "jane@mailinator.com" } },
        phones: {
            queryParams: { email: "jane.doe@stripe.com", enrich_mobile: true },
        },
    },
    "tomba#domain-status": {
        happy: { queryParams: { domain: "gmail.com" } },
    },
    "tomba#enrich": {
        happy: { queryParams: { email: "jane.doe@stripe.com" } },
        miss: { queryParams: { email: "john.roe@stripe.com" } },
    },
    "tomba#people/find": {
        happy: { queryParams: { email: "jane.doe@stripe.com" } },
        miss: { queryParams: { email: "john.roe@stripe.com" } },
    },
    "tomba#companies/find": {
        happy: { queryParams: { domain: "stripe.com" } },
        miss: { queryParams: { domain: "unknown-company-example.com" } },
    },
    "tomba#combined/find": {
        happy: { queryParams: { email: "jane.doe@stripe.com" } },
        miss: { queryParams: { email: "john.roe@stripe.com" } },
    },
    "tomba#phone-finder": {
        happy: { queryParams: { email: "jane.doe@stripe.com" } },
        miss: { queryParams: { email: "john.roe@stripe.com" } },
        domain: { queryParams: { domain: "stripe.com" } },
    },
    "tomba#phone-validator": {
        happy: { queryParams: { phone: "+14155550132" } },
        miss: { queryParams: { phone: "+3312345" } },
    },
    "tomba#reveal/search": {
        happy: {
            body: {
                filters: {
                    industry: { include: ["financial services"] },
                    location_country: { include: ["US"] },
                },
                page: 1,
            },
        },
        miss: {
            body: {
                filters: { location_city: { include: ["Atlantis"] } },
            },
        },
    },
    "tomba#similar": {
        happy: { queryParams: { domain: "stripe.com", limit: 10 } },
        miss: {
            queryParams: { domain: "unknown-company-example.com", limit: 10 },
        },
    },
    "tomba#technology": {
        happy: { queryParams: { domain: "stripe.com" } },
    },
    "tomba#domain-suggestions": {
        happy: { queryParams: { query: "stripe" } },
    },
    "tomba#location": {
        happy: { queryParams: { domain: "stripe.com" } },
    },
} as const satisfies Record<string, Record<string, RunInput>>;

export type TombaId = keyof typeof INPUTS;

/** `endpoints/<id path, slashes as dashes>/fixtures/` (hunterio layout). */
export const fixturesDir = (id: string): string =>
    fromFileUrl(
        new URL(
            `./endpoints/${id.split("#")[1].replaceAll("/", "-")}/fixtures/`,
            import.meta.url,
        ),
    );

/**
 * The schema gate: every `bad` input is refused as INVALID_INPUT before the
 * wire; every `good` near twin passes validation. A GET twin then fails
 * LATER, at replay URL matching (its query is not the happy fixture's); a
 * POST twin replays the happy chain (replay matches method + URL only) —
 * either way, never INVALID_INPUT.
 */
export async function assertGate(
    id: TombaId,
    bad: RunInput[],
    good: RunInput[],
): Promise<void> {
    const unit = await testSealedUnit(id);
    const fixture = await loadFixture(
        `${fixturesDir(id)}synthetic-happy.json`,
    );
    const run = (input: RunInput) =>
        runEndpoint({ unit, input, mode: "replay", fixture });
    for (const input of bad) {
        await assertRejects(
            () => run(input),
            Error,
            "INVALID_INPUT",
            JSON.stringify(input),
        );
    }
    for (const input of good) {
        const message = await run(input).then(
            () => "",
            (err: Error) => err.message,
        );
        assertEquals(
            message.includes("INVALID_INPUT"),
            false,
            `${JSON.stringify(input)}: ${message}`,
        );
    }
}

/** The live smoke test body: a 2xx object answer from the real API. */
export async function assertLive(id: TombaId): Promise<void> {
    const unit = await testSealedUnit(id);
    const result = await runEndpoint({
        unit,
        input: INPUTS[id].happy,
        mode: "live",
    });
    assertEquals(
        result.isProviderError,
        false,
        JSON.stringify(result.output).slice(0, 500),
    );
    assertEquals(
        Object.prototype.toString.call(result.output) === "[object Object]",
        true,
    );
}

/** The PRE-RUN estimate of one endpoint for one input (pure, no IO). */
export async function estimate(id: TombaId, input: RunInput) {
    return await estimateEndpoint(await testSealedUnit(id), input);
}

/** Replay one endpoint against one of its synthetic fixtures. `input`
 *  defaults to the INPUTS row of the same name. */
export async function replay(
    id: TombaId,
    name: string,
    input?: RunInput,
) {
    const unit = await testSealedUnit(id);
    const fixture = await loadFixture(
        `${fixturesDir(id)}synthetic-${name}.json`,
    );
    const rows = INPUTS[id] as Record<string, RunInput>;
    const result = await runEndpoint({
        unit,
        input: input ?? rows[name] ?? rows.happy,
        mode: "replay",
        fixture,
    });
    return { result, fixture };
}
