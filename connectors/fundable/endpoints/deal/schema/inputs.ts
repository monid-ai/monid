import { z } from "zod";
import { zUuid } from "../../../schema/common.ts";

/** Path params shared by GET /deals/{id} and GET /deals/{id}/investors. */
export const zDealPathParams = z.object({
    id: zUuid.describe("Deal UUID."),
}).strict();
