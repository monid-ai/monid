import { defineProvider, presets } from "@shared/core";

export default defineProvider({
    name: "computesdk",
    meta: {
        displayName: "ComputeSDK",
        summary:
            "A sandbox router: one API for over 26 sandbox providers, billed by the second.",
        description: "ComputeSDK gives an agent one API for isolated Linux " +
            "sandboxes across over 26 providers (E2B, Daytona, Modal, Vercel, " +
            "Cloudflare, Blaxel, Agent37 and more): create a sandbox, run shell " +
            "commands, read and write files, start background processes, " +
            "expose a port as a public URL, then destroy it. Sandboxes are " +
            "workspace-OWNED resources that bill by the second they run at " +
            "the provider and size rate shown before creation; every " +
            "operation inside a sandbox is free.",
        homepageUrl: "https://www.computesdk.com",
        docsUrl: "https://platform.computesdk.com/api/v1/openapi.json",
        categories: ["virtual-machines"],
        notes: [
            "Sandboxes are OWNED RESOURCES: sandbox-scoped endpoints only " +
            "operate on sandboxes this workspace created; a foreign or " +
            "unknown sandbox id is a uniform 404.",
            "A sandbox keeps billing until /destroy-sandbox or its timeout " +
            "(default 30 minutes). Destroy it when the work is done.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://platform.computesdk.com" },
});
