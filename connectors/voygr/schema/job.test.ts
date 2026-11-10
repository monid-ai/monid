import { assert, assertEquals } from "@std/assert";
import { testSealedUnit } from "@shared/testing";
import { zBatchPathParams } from "./job.ts";

Deno.test("job: a batch id is accepted", () => {
    assertEquals(
        zBatchPathParams.safeParse({ batch_id: "batch_01M5YB5CABS9" }).success,
        true,
    );
});

Deno.test("job: missing, empty, non-text and extra keys are refused", () => {
    for (
        const input of [
            {},
            { batch_id: "" },
            { batch_id: 7 },
            { batch_id: null },
            { batchid: "batch_1" },
            { batch_id: "batch_1", extra: true },
        ]
    ) {
        assertEquals(
            zBatchPathParams.safeParse(input).success,
            false,
            JSON.stringify(input),
        );
    }
});

Deno.test("job: the two batch runs share ONE interned fn per lifecycle phase", async () => {
    const keys = async (id: string) => {
        const { doc } = await testSealedUnit(id);
        const lifecycle = doc.lifecycle;
        assert(lifecycle, `${id} must carry a lifecycle`);
        return {
            start: lifecycle.start?.$fn.key,
            poll: lifecycle.poll?.$fn.key,
            stop: lifecycle.stop?.$fn.key,
        };
    };
    const validate = await keys("voygr#validate-batch");
    assert(validate.start && validate.poll && validate.stop);
    // one source per phase: a fix to the job protocol lands in both runs
    assertEquals(await keys("voygr#enrich-batch"), validate);
});

Deno.test("job: get-job and cancel-job run on the provider relay", async () => {
    const relay = (await testSealedUnit("voygr#get-call")).doc.lifecycle
        ?.start?.$fn.key;
    assert(relay);
    for (const id of ["voygr#get-job", "voygr#cancel-job"]) {
        const { doc } = await testSealedUnit(id);
        assertEquals(doc.lifecycle?.start?.$fn.key, relay, id);
        assertEquals(doc.lifecycle?.poll, undefined, id);
    }
});
