import { z } from "zod";
import { zTrackingToken } from "../../../schema/common.ts";

/** FrankKi `/track` body (Backend `trackInput`). */
export const zFrankkiTrackBody = z.object({ trackingToken: zTrackingToken });
