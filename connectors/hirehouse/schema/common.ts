import { z } from "zod";

/** A HireHouse job ID (UUID), as returned in `jobs[].id`. */
export const zJobId = z.string().uuid().describe(
    "A HireHouse job ID (UUID) from hirehouse#jobs/search.",
);
