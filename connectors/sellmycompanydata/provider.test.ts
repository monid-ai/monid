import { assert, assertEquals } from "@std/assert";
import { testBundle } from "@shared/testing";
import { MCP_URL, WIRE_HEADERS } from "./test-support.ts";

const CHECKLIST = "sellmycompanydata#assessment-checklist";
const ESTIMATE = "sellmycompanydata#estimate-data-value";

Deno.test("sellmycompanydata: two read-only MCP tools, keyless, FREE, no request_offer", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("sellmycompanydata#")
    ).sort();
    // read-only on purpose: request_offer is not ported
    assertEquals(ids, [CHECKLIST, ESTIMATE]);

    const checklist = bundle.endpoints[CHECKLIST];
    const estimate = bundle.endpoints[ESTIMATE];
    const synthesized = checklist.usage.evidence.$fn.key;
    assertEquals(
        bundle.fnTable[synthesized].provenance,
        "core#usage.synthesizedEmpty",
    );
    assert(checklist.lifecycle?.start, "provider lifecycle.start resolves");
    assert(checklist.output.fromError, "provider fromError resolves");
    for (const doc of [checklist, estimate]) {
        assertEquals(doc.request.method, "POST", doc.id);
        assertEquals(doc.request.url, MCP_URL, doc.id);
        assertEquals(doc.request.headers, {
            accept: WIRE_HEADERS.accept,
            "mcp-protocol-version": WIRE_HEADERS["mcp-protocol-version"],
        }, doc.id);
        // keyless: one identity inject, an empty credential shape
        assertEquals(
            Object.keys(
                (doc.auth.credentials as { properties?: object })
                    .properties ?? {},
            ),
            [],
            doc.id,
        );
        assertEquals(
            doc.auth.inject.$fn.key,
            checklist.auth.inject.$fn.key,
            doc.id,
        );
        // FREE: no meter, compiler-synthesized quantities
        assertEquals(doc.usage.model.kind, "FREE", doc.id);
        assertEquals(doc.usage.consolidate, undefined, doc.id);
        assertEquals(doc.usage.evidence.$fn.key, synthesized, doc.id);
        assertEquals(doc.usage.estimate.$fn.key, synthesized, doc.id);
        // one envelope check and one error digest serve both tools
        assertEquals(
            doc.lifecycle?.start?.$fn.key,
            checklist.lifecycle?.start?.$fn.key,
            doc.id,
        );
        assertEquals(
            doc.output.fromError?.$fn.key,
            checklist.output.fromError?.$fn.key,
            doc.id,
        );
        // each endpoint pins its own tool name
        assert(doc.input.toRequest, doc.id);
        assertEquals(doc.timeouts.requestMs, 15_000, doc.id);
        assertEquals(doc.timeouts.runMs, 20_000, doc.id);
        assert(
            bundle.taxonomy.membership["funding-data"].includes(doc.id),
            doc.id,
        );
    }
    assert(
        checklist.input.toRequest?.$fn.key !==
            estimate.input.toRequest?.$fn.key,
    );
    // only the estimate takes arguments
    assertEquals(checklist.input.schema.body, undefined);
    assert(estimate.input.schema.body);
    // the estimate swaps one field, so it carries its own presentation fn
    assert(
        estimate.output.fromResponse?.$fn.key !==
            checklist.output.fromResponse?.$fn.key,
    );
});
