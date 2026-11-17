import { z } from "zod";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zBody = z.strictObject({
    "allTime": z.union([
        z.boolean().describe(
            "Use true for all synced merchant history; dates are ignored. Use it when the answer may be older than the default 30 days: the last or first time, ever, annual or one-off charges, or 'did I pay X before'.",
        ),
        z.null().describe(
            "Use true for all synced merchant history; dates are ignored. Use it when the answer may be older than the default 30 days: the last or first time, ever, annual or one-off charges, or 'did I pay X before'.",
        ),
    ]).describe(
        "Use true for all synced merchant history; dates are ignored. Use it when the answer may be older than the default 30 days: the last or first time, ever, annual or one-off charges, or 'did I pay X before'.",
    ).optional(),
    "cursor": z.union([
        z.strictObject({
            "offset": z.number().int().min(0).max(100000),
            "revision": z.number().int().min(-9007199254740991).max(
                9007199254740991,
            ),
        }),
        z.null(),
    ]).optional(),
    "startDate": z.union([z.iso.date(), z.null()]).describe(
        "Start date (ISO format, e.g. 2025-01-01). Use null for 30 days ago.",
    ),
    "endDate": z.union([z.iso.date(), z.null()]).describe(
        "End date (ISO format). Use null for today.",
    ),
    "merchant": z.union([
        z.string().describe("Merchant name to search for (partial match)."),
        z.null().describe("Merchant name to search for (partial match)."),
    ]).describe("Merchant name to search for (partial match)."),
    "traits": z.union([
        z.array(
            z.enum([
                "discretionary",
                "travel",
                "health",
                "kids",
                "gifts",
                "charity",
                "business",
                "crypto",
            ]),
        ),
        z.null(),
    ]).describe(
        "Only transactions whose merchant has every listed trait. Use for purposes a category does not capture. discretionary: optional spending: dining out, entertainment, hobbies, shopping for wants; travel: trips: flights, hotels, rental cars, cruises, travel booking; health: medical care: doctors, dentists, pharmacies, vision, therapy; kids: children: childcare, schools, tutoring, toys, kids' activities; gifts: gifts: florists, gift shops, gift cards; charity: donations: charities, nonprofits, religious organizations, fundraisers; business: work expenses: software, office supplies, coworking, professional services; crypto: crypto: exchanges, on-ramps, wallets, crypto cards. Person-to-person payments and unrecognized merchants carry no traits. Use null for no trait filter.",
    ),
    "category": z.union([
        z.string().describe(
            "Category code (e.g. FOOD_AND_DRINK, TRANSPORTATION, ENTERTAINMENT).",
        ),
        z.null().describe(
            "Category code (e.g. FOOD_AND_DRINK, TRANSPORTATION, ENTERTAINMENT).",
        ),
    ]).describe(
        "Category code (e.g. FOOD_AND_DRINK, TRANSPORTATION, ENTERTAINMENT).",
    ),
    "transactionTypes": z.union([
        z.array(
            z.enum([
                "bank_deposit",
                "bank_withdrawal",
                "card_charge",
                "card_refund",
                "ach_transfer",
                "wire",
                "check",
                "atm",
                "cash",
                "interest_payment",
                "fee",
                "buy",
                "sell",
                "short_sell",
                "buy_to_cover",
                "swap",
                "dividend",
                "qualified_dividend",
                "capital_gain_distribution",
                "return_of_capital",
                "interest",
                "bond_coupon",
                "airdrop",
                "fork",
                "staking_reward",
                "mining_reward",
                "lending_reward",
                "nft_mint",
                "nft_sale",
                "nft_purchase",
                "lp_mint",
                "lp_burn",
                "lending_supply",
                "lending_borrow",
                "lending_repay",
                "transfer",
                "bridge_out",
                "bridge_in",
                "split",
                "spin_off",
                "merger_proceeds",
                "rights_issue",
                "manual_valuation_change",
                "other",
                "payment",
                "refund",
                "deposit",
                "withdrawal",
                "receive",
                "send",
                "transfer_in",
                "transfer_out",
            ]),
        ),
        z.null(),
    ]).describe(
        "Filter by transaction type. For investment account deposits/withdrawals, use transfer_in/deposit/bank_deposit for deposits and transfer_out/withdrawal/bank_withdrawal for withdrawals.",
    ),
    "transactionClass": z.union([
        z.enum(["bank", "brokerage", "crypto_exchange", "blockchain_wallet"]),
        z.null(),
    ]).describe(
        "Filter by normalized transaction class. Use brokerage for investment accounts.",
    ),
    "accountId": z.union([
        z.string().describe(
            "Filter to a specific account by ID. Use null to search all accounts.",
        ),
        z.null().describe(
            "Filter to a specific account by ID. Use null to search all accounts.",
        ),
    ]).describe(
        "Filter to a specific account by ID. Use null to search all accounts.",
    ),
    "minAmount": z.union([
        z.number().describe("Minimum transaction amount."),
        z.null().describe("Minimum transaction amount."),
    ]).describe("Minimum transaction amount."),
    "maxAmount": z.union([
        z.number().describe("Maximum transaction amount."),
        z.null().describe("Maximum transaction amount."),
    ]).describe("Maximum transaction amount."),
    "limit": z.union([
        z.number().int().min(-9007199254740991).max(9007199254740991),
        z.null(),
    ]).describe("Max results to return (default 25, max 50). Use null for 25."),
});
