import type { RunInput } from "@shared/core";

// Synthetic inputs for all current tools; never use these to create live actions.
export const cases: {
    name: string;
    fixture: string;
    input: RunInput;
    readOnly: boolean;
    scopes: string[];
}[] = [
    {
        "name": "search_markets",
        "fixture": "search-markets",
        "input": {
            "body": {
                "query": "synthetic",
                "kind": null,
                "source": null,
                "limit": 1,
                "offset": 0,
            },
        },
        "readOnly": true,
        "scopes": [
            "investments:read",
        ],
    },
    {
        "name": "get_overview",
        "fixture": "get-overview",
        "input": {
            "body": {},
        },
        "readOnly": true,
        "scopes": [
            "accounts:read",
            "networth:read",
        ],
    },
    {
        "name": "get_setup_status",
        "fixture": "setup-status",
        "input": {
            "body": {},
        },
        "readOnly": true,
        "scopes": [
            "accounts:read",
        ],
    },
    {
        "name": "list_accounts",
        "fixture": "list-accounts",
        "input": {
            "body": {},
        },
        "readOnly": true,
        "scopes": [
            "accounts:read",
        ],
    },
    {
        "name": "get_net_worth_history",
        "fixture": "get-net-worth-history",
        "input": {
            "body": {
                "period": null,
            },
        },
        "readOnly": true,
        "scopes": [
            "networth:read",
        ],
    },
    {
        "name": "explain_net_worth_change",
        "fixture": "explain-net-worth-change",
        "input": {
            "body": {
                "startDate": "2026-10-25",
                "endDate": "2026-10-25",
            },
        },
        "readOnly": true,
        "scopes": [
            "networth:read",
        ],
    },
    {
        "name": "search_transactions",
        "fixture": "search-transactions",
        "input": {
            "body": {
                "startDate": null,
                "endDate": null,
                "merchant": "synthetic",
                "traits": null,
                "category": "synthetic",
                "transactionTypes": null,
                "transactionClass": null,
                "accountId": "synthetic",
                "minAmount": 0,
                "maxAmount": 0,
                "limit": null,
            },
        },
        "readOnly": true,
        "scopes": [
            "transactions:read",
        ],
    },
    {
        "name": "analyze_spending",
        "fixture": "analyze-spending",
        "input": {
            "body": {
                "startDate": null,
                "endDate": null,
                "comparison": null,
            },
        },
        "readOnly": true,
        "scopes": [
            "transactions:read",
        ],
    },
    {
        "name": "detect_spending_patterns",
        "fixture": "detect-spending-patterns",
        "input": {
            "body": {
                "startDate": null,
                "endDate": null,
            },
        },
        "readOnly": true,
        "scopes": [
            "transactions:read",
        ],
    },
    {
        "name": "get_account_flows",
        "fixture": "get-account-flows",
        "input": {
            "body": {
                "startDate": null,
                "endDate": null,
                "accountIds": null,
                "accountType": null,
                "institution": "synthetic",
                "direction": null,
                "limit": null,
            },
        },
        "readOnly": true,
        "scopes": [
            "accounts:read",
            "transactions:read",
        ],
    },
    {
        "name": "get_cash_flow",
        "fixture": "cash-flow",
        "input": {
            "body": {
                "startDate": "2026-10-01",
                "endDate": "2026-10-10",
            },
        },
        "readOnly": true,
        "scopes": [
            "cashflow:read",
        ],
    },
    {
        "name": "list_recurring",
        "fixture": "recurring",
        "input": {
            "body": {},
        },
        "readOnly": true,
        "scopes": [
            "cashflow:read",
        ],
    },
    {
        "name": "get_portfolio",
        "fixture": "get-portfolio",
        "input": {
            "body": {
                "symbol": "synthetic",
                "instrumentId": "synthetic",
                "type": "synthetic",
                "groupBy": "type",
                "includePositions": false,
                "limit": null,
            },
        },
        "readOnly": true,
        "scopes": [
            "investments:read",
        ],
    },
    {
        "name": "get_defi_positions",
        "fixture": "get-defi-positions",
        "input": {
            "body": {
                "protocol": "synthetic",
                "chain": "synthetic",
            },
        },
        "readOnly": true,
        "scopes": [
            "investments:read",
        ],
    },
    {
        "name": "get_vault_yields",
        "fixture": "get-vault-yields",
        "input": {
            "body": {},
        },
        "readOnly": true,
        "scopes": [
            "investments:read",
        ],
    },
    {
        "name": "list_debts",
        "fixture": "list-debts",
        "input": {
            "body": {},
        },
        "readOnly": true,
        "scopes": [
            "debts:read",
        ],
    },
    {
        "name": "simulate_debt_payoff",
        "fixture": "simulate-debt-payoff",
        "input": {
            "body": {
                "strategy": "avalanche",
                "extraMonthly": 0,
            },
        },
        "readOnly": true,
        "scopes": [
            "debts:read",
        ],
    },
    {
        "name": "get_checklist",
        "fixture": "get-checklist",
        "input": {
            "body": {},
        },
        "readOnly": true,
        "scopes": [
            "checklist:read",
        ],
    },
    {
        "name": "search_activity",
        "fixture": "search-activity",
        "input": {
            "body": {
                "actorType": "agent",
                "action": null,
                "limit": null,
            },
        },
        "readOnly": true,
        "scopes": [
            "activity:read",
        ],
    },
    {
        "name": "list_observations",
        "fixture": "list-observations",
        "input": {
            "body": {
                "status": null,
                "limit": null,
                "before": null,
            },
        },
        "readOnly": true,
        "scopes": [
            "accounts:read",
            "networth:read",
            "transactions:read",
            "cashflow:read",
            "investments:read",
            "debts:read",
        ],
    },
    {
        "name": "propose_category_change",
        "fixture": "propose-category-change",
        "input": {
            "body": {
                "transactionIds": [
                    "11111111-1111-4111-8111-111111111111",
                ],
                "category": "FOOD_AND_DRINK",
            },
        },
        "readOnly": false,
        "scopes": [
            "transactions:read",
            "corrections:prepare",
        ],
    },
    {
        "name": "propose_recurring_kind",
        "fixture": "propose-recurring-kind",
        "input": {
            "body": {
                "streamId": "synthetic",
                "kind": "bill",
            },
        },
        "readOnly": false,
        "scopes": [
            "cashflow:read",
            "corrections:prepare",
        ],
    },
    {
        "name": "propose_debt_details",
        "fixture": "propose-debt-details",
        "input": {
            "body": {
                "interestRate": 24.99,
                "minimumPayment": null,
                "nextPaymentDueDate": null,
                "debtId": "11111111-1111-4111-8111-111111111111",
            },
        },
        "readOnly": false,
        "scopes": [
            "debts:read",
            "corrections:prepare",
        ],
    },
    {
        "name": "request_transfer",
        "fixture": "request-transfer",
        "input": {
            "body": {
                "chain": "solana",
                "fromWallet": "synthetic",
                "toWallet": "synthetic",
                "amountUsdc": "10.25",
                "idempotencyKey": "synthetic-key-0001",
            },
        },
        "readOnly": false,
        "scopes": [
            "accounts:read",
            "transfers:prepare",
        ],
    },
    {
        "name": "request_bank_transfer",
        "fixture": "request-bank-transfer",
        "input": {
            "body": {
                "sourceAccountId": "synthetic",
                "destinationAccountId": "synthetic",
                "amountUsd": "10.25",
                "idempotencyKey": "synthetic-key-0001",
            },
        },
        "readOnly": false,
        "scopes": [
            "accounts:read",
            "transfers:bank",
        ],
    },
    {
        "name": "request_vault_deposit",
        "fixture": "request-vault-deposit",
        "input": {
            "body": {
                "vault": "0x1111111111111111111111111111111111111111",
                "fromWallet": "0x1111111111111111111111111111111111111111",
                "amountUsd": "10.25",
                "idempotencyKey": "synthetic-key-0001",
            },
        },
        "readOnly": false,
        "scopes": [
            "investments:read",
            "transfers:vault",
        ],
    },
    {
        "name": "get_action_request",
        "fixture": "get-action-request",
        "input": {
            "body": {
                "requestId": "11111111-1111-4111-8111-111111111111",
            },
        },
        "readOnly": true,
        "scopes": [
            "transfers:read",
        ],
    },
    {
        "name": "cancel_action_request",
        "fixture": "cancel-action-request",
        "input": {
            "body": {
                "requestId": "11111111-1111-4111-8111-111111111111",
            },
        },
        "readOnly": false,
        "scopes": [
            "transfers:prepare",
        ],
    },
    {
        "name": "submit_feedback",
        "fixture": "submit-feedback",
        "input": {
            "body": {
                "category": "bug",
                "description": "synthetic",
                "idempotencyKey": "11111111-1111-4111-8111-111111111111",
                "userApproved": true,
            },
        },
        "readOnly": false,
        "scopes": [
            "feedback:submit",
        ],
    },
];
