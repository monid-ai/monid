import { assertEquals } from "@std/assert";
import { testBundle, testResourceUnit, testSealedUnit } from "@shared/testing";

Deno.test("agentmail: stable public paths, shared projection and closed bearer auth", async () => {
    const bundle = await testBundle();
    assertEquals(
        Object.keys(bundle.endpoints).filter((id) =>
            id.startsWith("agentmail#")
        ).sort(),
        [
            "agentmail#create-inboxes",
            "agentmail#inboxes/{id}",
            "agentmail#list-inboxes",
            "agentmail#release-inboxes/{id}",
            "agentmail#update-inboxes/{id}",
        ],
    );
    const create = await testSealedUnit("agentmail#create-inboxes");
    const get = await testSealedUnit("agentmail#inboxes/{id}");
    const update = await testSealedUnit("agentmail#update-inboxes/{id}");
    const resource = await testResourceUnit("agentmail/mailbox");
    assertEquals(create.doc.output.fromResponse, get.doc.output.fromResponse);
    assertEquals(get.doc.output.fromResponse, update.doc.output.fromResponse);
    assertEquals(get.doc.lifecycle?.start, update.doc.lifecycle?.start);
    assertEquals(create.doc.auth, resource.doc.auth);
    assertEquals(create.doc.usage.credits, {
        default: { label: "US dollars" },
    });
});
