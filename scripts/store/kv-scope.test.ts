import { assertEquals } from "@std/assert";
import { KvResourceStore } from "./kv.ts";

Deno.test({
    name:
        "local resource store: ownership persists independently for each host scope",
    ignore: typeof Deno.openKv !== "function",
    fn: async () => {
        const directory = await Deno.makeTempDir();
        const alpha = await KvResourceStore.open(
            `${directory}/test.db`,
            "alpha",
        );
        const beta = await KvResourceStore.open(`${directory}/test.db`, "beta");
        try {
            const base = {
                resource: "ambiguous/connection",
                externalId: "same-id",
            };
            await alpha.provision({ ...base, data: { label: "alpha" } });
            assertEquals(await beta.owned({ resource: base.resource }), []);
            await beta.provision({ ...base, data: { label: "beta" } });
            assertEquals((await alpha.list())[0].data, { label: "alpha" });
            assertEquals((await beta.list())[0].data, { label: "beta" });
            await alpha.release(base.resource, base.externalId);
            assertEquals(await alpha.list(), []);
            assertEquals((await beta.list())[0].data, { label: "beta" });
        } finally {
            alpha.close();
            beta.close();
            await Deno.remove(directory, { recursive: true });
        }
    },
});
