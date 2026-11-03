import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "specstream#v1/finds/{id}/rows";
const FIND = "find_synthetic_0001";

Deno.test("specstream#v1/finds/{id}/rows: rows keep the page each value came from, and reading bills nothing", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { pathParams: { id: FIND } },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-find-rows-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    type Cell = { provenance?: { source_url?: string } | null };
    const data = (result.output as {
        data: {
            rows: { cells: Cell[] }[];
            commerce: { amount_captured_cents: number };
        };
    }).data;
    assertEquals(data.rows.length, 2);
    assertEquals(
        data.rows[0].cells[0].provenance?.source_url,
        "https://clinic-1.example.org/about",
    );
    // the receipt rides along as data; the run that earned it was billed once
    assertEquals(data.commerce.amount_captured_cents, 35);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("specstream#v1/finds/{id}/rows: the gate needs the find id and bounds the page size", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-find-rows-ok.json`);
    const rejected = (input: Record<string, unknown>) =>
        assertRejects(
            () => runEndpoint({ unit, input, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
        );
    await rejected({});
    await rejected({ pathParams: { id: FIND }, queryParams: { limit: 0 } });
    await rejected({ pathParams: { id: FIND }, queryParams: { limit: 101 } });
    await assertInputAccepted({
        unit,
        input: { pathParams: { id: FIND }, queryParams: { limit: 100 } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: "specstream#v1/finds/{id}/rows live (gated on SPECSTREAM_API_KEY)",
    ignore: liveSkip("specstream"),
    fn: async () => {
        // reading a find the key already owns; set SPECSTREAM_TEST_FIND_ID
        const id = Deno.env.get("SPECSTREAM_TEST_FIND_ID");
        if (!id) return;
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { pathParams: { id }, queryParams: { limit: 5 } },
            mode: "live",
        });
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
