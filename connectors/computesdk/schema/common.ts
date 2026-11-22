import { z } from "zod";

export const zSandboxId = z.string().min(1).describe(
    "The id of a sandbox YOU created (from /create-sandbox).",
);

export const zAbsolutePath = z.string().min(1).regex(
    /^\//,
    "path must be absolute",
).describe("An absolute path inside the sandbox, e.g. /workspace/main.py.");

export const zEnv = z.record(z.string(), z.string()).describe(
    "Extra environment variables for this command.",
).optional();

/** The managed providers /get-options lists. */
export const zProvider = z.enum([
    "agent37",
    "archil",
    "beam",
    "blaxel",
    "buddy",
    "cloudflare",
    "daytona",
    "e2b",
    "freestyle",
    "isorun",
    "luxor",
    "microsandbox",
    "miosa",
    "modal",
    "mosaic",
    "namespace",
    "novita",
    "railway",
    "sail",
    "sandbox0",
    "sfcompute",
    "sprites",
    "superserve",
    "tensorlake",
    "upstash",
    "vercel",
]);
