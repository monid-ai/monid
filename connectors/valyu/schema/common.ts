import { z } from "zod";

export const zResponseLength = z.union([
    z.enum(["short", "medium", "large", "max"]),
    z.number().int().positive(),
]).describe(
    "Content character cap: short 25000, medium 50000, large 100000, max unlimited, or a positive integer.",
);

export const zSearchDate = z.union([
    z.iso.date(),
    z.iso.datetime({ offset: true }),
]).describe("YYYY-MM-DD; ISO-8601 timestamps require historical_cache: true.");

// An explicit pattern survives Zod's JSON Schema conversion; the protocol
// option alone does not enforce HTTP/HTTPS in the compiled artifact.
export const zHttpUrl = z.intersection(
    z.url(),
    z.string().regex(/^https?:\/\/[^\s/?#]+(?:[/?#][^\s]*)?$/),
);
