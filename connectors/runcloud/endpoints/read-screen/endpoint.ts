import { defineEndpoint, type Json, UsageModelKind } from "@shared/core";
import { zSessionPathParams } from "../../schema/common.ts";

/**
 * /read-screen — the current screen as a flat, trimmed list of
 * accessibility elements (`GET /run-cloud/{platform}/{sessionId}/accessibility`).
 *
 * The vendor answers a nested tree (run-cloud/sdk
 * `SimulatorAccessibilitySnapshot`) that can run to thousands of nodes. The
 * projection below is the run.cloud MCP's own `trimSnapshot`: walk in
 * screen order, skip structural containers with nothing to read, keep the
 * first 400, and add each element's normalized `center` so the result
 * feeds /tap directly.
 */
export default defineEndpoint({
    meta: {
        displayName: "Read Simulator Screen",
        summary:
            "Read what is on a simulator's screen: every element's role, text and tap point.",
        description:
            "Read the accessibility tree of one of YOUR sessions' current " +
            "screen, flattened in screen order: each element's role " +
            "(button, text, text-field, switch...), label, value, " +
            "identifier, bounds, enabled/focused state, and `center`, its " +
            "normalized tap point (pass center.x and center.y to /tap). " +
            "Structural containers with no text are skipped and the list " +
            "stops at 400 elements (`truncated` says when more exist; " +
            "scroll and read again). This is how an agent sees the app: " +
            "find the control by its label, tap its center, read again to " +
            "confirm. Secure text fields never expose their value. Free.",
        categories: ["mobile-simulators"],
    },
    endpoint: "/read-screen",
    request: {
        method: "GET",
        path: "/run-cloud/{platform}/{sessionId}/accessibility",
    },
    input: { schema: { pathParams: zSessionPathParams } },
    resources: {
        reads: [{
            id: "runcloud/simulator-session",
            key: "$.pathParams.sessionId",
        }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
    output: {
        fromResponse: ({ data }) => {
            type AxNode = {
                role?: string;
                label?: string | null;
                value?: string | null;
                identifier?: string | null;
                bounds?: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                } | null;
                states?: { enabled?: boolean; focused?: boolean | null };
                children?: AxNode[];
            };
            const snapshot = data.output as {
                platform?: string;
                capturedAt?: string;
                screen?: { width: number; height: number; unit: string };
                truncated?: boolean;
                roots?: AxNode[];
            };
            const screen = snapshot.screen;
            const structural = [
                "group",
                "other",
                "window",
                "application",
                "scroll-view",
                "list",
            ];
            // depth-first in screen order: push children reversed
            const stack: { node: AxNode; depth: number }[] = (
                snapshot.roots ?? []
            ).map((node) => ({ node, depth: 0 })).reverse();
            const nodes: Json[] = [];
            let informative = 0;
            while (stack.length > 0) {
                const { node, depth } = stack.pop()!;
                const children = node.children ?? [];
                for (let i = children.length - 1; i >= 0; i--) {
                    stack.push({ node: children[i], depth: depth + 1 });
                }
                if (
                    !node.label && !node.value && !node.identifier &&
                    structural.includes(node.role ?? "other")
                ) continue;
                informative += 1;
                if (nodes.length >= 400) continue;
                const b = node.bounds ?? null;
                const tappable = b !== null && b.width > 0 && b.height > 0 &&
                    screen !== undefined && screen.width > 0 &&
                    screen.height > 0;
                nodes.push({
                    depth,
                    role: node.role ?? "other",
                    label: node.label ?? null,
                    value: node.value ?? null,
                    identifier: node.identifier ?? null,
                    bounds: b === null ? null : {
                        x: Math.round(b.x),
                        y: Math.round(b.y),
                        width: Math.round(b.width),
                        height: Math.round(b.height),
                    },
                    center: !tappable ? null : {
                        x: Math.round(
                            Math.min(
                                1,
                                Math.max(0, (b.x + b.width / 2) / screen.width),
                            ) * 1000,
                        ) / 1000,
                        y: Math.round(
                            Math.min(
                                1,
                                Math.max(
                                    0,
                                    (b.y + b.height / 2) / screen.height,
                                ),
                            ) * 1000,
                        ) / 1000,
                    },
                    enabled: node.states?.enabled ?? null,
                    focused: node.states?.focused ?? null,
                });
            }
            return {
                platform: snapshot.platform ?? null,
                capturedAt: snapshot.capturedAt ?? null,
                screen: screen ?? null,
                nodeCount: nodes.length,
                truncated: snapshot.truncated === true ||
                    informative > nodes.length,
                nodes,
            };
        },
    },
});
