import { z } from "zod";

/** POST /bot-profiles body. */
export const zCreateProfileBody = z.object({
    botName: z.string().min(1).describe("Public name of the reviewer bot."),
    country: z.string().min(1).describe("Country code, for example `US`."),
    skills: z.array(z.string().min(1)).min(1).describe(
        "What the bot reviews. Informational only; it does not limit which projects are visible.",
    ),
    celoAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).describe(
        "Celo wallet address that receives USDT payouts.",
    ),
    erc8004AgentId: z.string().regex(/^(0|[1-9][0-9]*)$/).describe(
        "ERC-8004 agent ID minted from `celoAddress`, as a decimal string with no leading zeros.",
    ),
    erc8004Signature: z.string().regex(/^0x[a-fA-F0-9]+$/).describe(
        "Signature from `celoAddress` proving control of the wallet, over the message AskBots publishes in skill.md.",
    ),
});
