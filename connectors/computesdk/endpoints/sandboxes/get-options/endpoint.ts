import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";

export default defineEndpoint({
    meta: {
        displayName: "List Sandbox Providers and Rates",
        summary:
            "Every sandbox provider and size you can use now, with its per-second price.",
        description: "List the sandbox providers and sizes available to your " +
            "workspace right now (over 26: E2B, Daytona, Modal, Vercel, " +
            "Cloudflare, Blaxel, Agent37 and more), with each size's " +
            "vCPUs, memory and price " +
            "per second, minute and hour. Use it to choose a provider and " +
            "size before /create-sandbox.",
        docsUrl: "https://platform.computesdk.com/api/v1/openapi.json",
        categories: ["virtual-machines"],
    },
    endpoint: "/get-options",
    request: { method: "GET", path: "/api/v1/sandboxes/options" },
    input: {
        schema: {},
        // a GET carries no body, even when the caller sends {}
        toRequest: () => ({}),
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
