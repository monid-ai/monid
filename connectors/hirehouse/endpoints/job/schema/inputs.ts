import { z } from "zod";
import { zJobId } from "../../../schema/common.ts";

/** `GET /jobs/{id}` path parameters. */
export const zJobPathParams = z.object({ id: zJobId }).strict();
