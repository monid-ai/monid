import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const chain = (name: string) => loadFixture(`${FIXTURES}${name}.json`);
const ID = "reversecontact#v2/contact/phone";
const asRecord = (value: Json | undefined) =>
    value as Record<string, Json | undefined>;

const run = async (fixture: string) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { fullName: "Jane Doe", companyDomain: "example.com" } },
        mode: "replay",
        fixture: await chain(fixture),
    });

Deno.test(`${ID} found: 20 credits on the job's receipt, the number in data.result`, async () => {
    const result = await run("synthetic-contact-phone-found");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 20 },
        evidence: { CREDIT: 20 },
    });
    const data = asRecord(asRecord(result.output).data);
    assertEquals(data.result, [{ value: "+33612345678", type: "mobile" }]);
    assertEquals("creditsConsumed" in data, false);
});

Deno.test(`${ID} phone finding off: the bare 410 body reads as a coded error, zero usage`, async () => {
    const result = await run("synthetic-contact-phone-disabled");
    assertEquals(result.httpStatus, 410);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = asRecord(result.output);
    assertEquals(output.code, "endpoint_unavailable");
    assertEquals(
        (output.message as string).startsWith(
            "Phone finding is not enabled for this workspace.",
        ),
        true,
    );
});
