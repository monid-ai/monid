/** Retained native successes for review and individually selected live tests.
 * These are dated targets, not a promise that a shop product stays available.
 */
export const reviewCases = [
    ["google/search", "recorded-2026-10-22-google", 0.001],
    ["google/images", "recorded-expansion-google-images", 0.001],
    ["google/local", "recorded-expansion-google-local", 0.001],
    ["google/videos", "recorded-expansion-google-videos", 0.001],
    ["google/shopping", "recorded-expansion-google-shopping", 0.001],
    ["google/news", "recorded-expansion-google-news", 0.001],
    ["ai/perplexity", "recorded-expansion-ai-perplexity", 0.0018],
    ["ai/grok", "recorded-options-grok-auto", 0.0018],
    ["ai/chatgpt", "recorded-2026-10-22-ai", 0.002],
    ["ai/gemini", "recorded-ready-gemini-product-cards", 0.0018],
    ["ai/aimode", "recorded-ready-aimode-public-search-url", 0.0018],
    ["ai/overview", "recorded-expansion-ai-overview", 0.0018],
    ["ai/alexa", "recorded-closure-ai-alexa", 0.003],
    ["ai/copilot", "recorded-six-ai-copilot", 0.002],
    ["web-unlocker", "recorded-2026-10-22-unlocker", 0.001],
    ["amazon/product", "recorded-closure-amazon-product", 0.003],
    ["amazon/seller", "recorded-closure-amazon-seller", 0.003],
    ["amazon/keywords", "recorded-closure-amazon-keywords", 0.003],
    ["amazon/rufus", "recorded-six-amazon-rufus-options", 0.003],
    ["tiktok/user/detail", "recorded-closure-tiktok-user-detail", 0.003],
    ["tiktok/user/work", "recorded-six-tiktok-user-work", 0.003],
    ["tiktok/shop/page", "recorded-ready-shop-current-0", 0.003],
] as const;
