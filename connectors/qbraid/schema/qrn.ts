import { z } from "zod";

/** `{qrn}` path parameter of the device routes. */
export const zDeviceQrnPathParams = z.object({
    qrn: z.string().min(1).max(255).describe(
        "Device QRN, e.g. aws:aws:sim:sv1 or ibm:ibm:qpu:fez (from " +
            "qbraid#list-devices).",
    ),
});

/** `{qrn}` path parameter of the job routes. */
export const zJobQrnPathParams = z.object({
    qrn: z.string().min(1).describe(
        "Job QRN, e.g. aws:aws:sim:sv1-1234-qjob-abc123 (the jobQrn " +
            "returned by qbraid#submit-job).",
    ),
});
