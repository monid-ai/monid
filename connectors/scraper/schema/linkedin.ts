/**
 * LinkedIn numeric id (job id, company id): 1 to 32 digits. The vendor
 * validates `jobId` and `companyId` with this one pattern (its
 * `LINKEDIN_JOB_ID_PATTERN`), so the 32-digit bound holds for a company id
 * too. The vendor trims the value first, so surrounding whitespace is
 * accepted here too.
 */
export const linkedinNumericIdPattern = /^\s*[0-9]{1,32}\s*$/;
