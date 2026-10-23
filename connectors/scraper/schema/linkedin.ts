/**
 * LinkedIn numeric id (job id, company id): 1 to 32 digits. Both LinkedIn
 * tools that take an id validate it with this one pattern.
 */
export const linkedinNumericIdPattern = /^[0-9]{1,32}$/;
