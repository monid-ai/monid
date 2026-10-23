/**
 * LinkedIn numeric id (job id, company id): 1 to 32 digits. Both LinkedIn
 * tools that take an id validate it with this one pattern. The vendor trims
 * the value first, so surrounding whitespace is accepted here too.
 */
export const linkedinNumericIdPattern = /^\s*[0-9]{1,32}\s*$/;
