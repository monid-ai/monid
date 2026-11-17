import { defineProvider, presets } from "@shared/core";

/**
 * Local mailbox slice, checked 2026-10-27 against Monid inspect and
 * https://monid.ai/tutorial/how-to-monid-agent-email-and-phone.
 * Monid's mailbox card is $1/month; the creating run pays period one.
 * This is the Monid contract, not AgentMail's retail subscription price.
 *
 * Release scheduling and wallet settlement belong to the host. Custom
 * domains, legacy resource migration and hosted response enrichment
 * must be integrated before this slice is ready for deployment.
 */
export default defineProvider({
    name: "agentmail",
    meta: {
        displayName: "AgentMail",
        summary: "Create and manage workspace-owned email inboxes for agents.",
        homepageUrl: "https://www.agentmail.to",
        docsUrl: "https://docs.agentmail.to",
        categories: ["agentic-email"],
        notes: [
            "Mailbox operations are ownership-scoped; inboxId is the mailbox address.",
            "Mailboxes use the agentmail.to domain. Custom domains are not supported by these operations.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.agentmail.to" },
    usage: { credits: { default: { label: "US dollars" } } },
});
