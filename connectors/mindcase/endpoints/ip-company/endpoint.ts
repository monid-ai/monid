import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zIpCompanyBody } from "./schema/inputs.ts";

/**
 * Mindcase `ip/company`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "IP Company",
        summary:
            "The company behind an IP address, with domain, ASN, AS name " +
            "and ISP. Pass the IPs to look up.",
        description:
            "The company behind an IP address, with domain, ASN, AS name " +
            "and ISP. Pass the IPs to look up. Returns one row per lookup " +
            "with ip, found, companyName, domain, asn, asName, isp, " +
            "isHosting, cloudProvider, networkName, networkCidr, rir, " +
            "hostname, abuseEmail, country, countryCode, region, city, " +
            "latitude, longitude, timezone, ipVersion. For the full " +
            "company profile behind the domain use " +
            "mindcase#companies/enrichment. $0.01 per lookup; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/ip/company",
        categories: ["company-enrichment"],
    },
    endpoint: "/ip/company",
    request: { method: "POST", path: "/v1/data/ip/company/run" },
    input: {
        schema: {
            body: zIpCompanyBody,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.01 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.ips.length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
