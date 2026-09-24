import { z } from "zod";

export const pathParams = z.object({
    id: z.string().uuid(),
}).strict();
