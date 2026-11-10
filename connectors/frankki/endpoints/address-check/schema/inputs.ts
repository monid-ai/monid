import { z } from "zod";
import { zAddressShape } from "../../../schema/common.ts";

/** FrankKi `/address-check` body (Backend `address`). */
export const zFrankkiAddressCheckBody = z.object(zAddressShape);
