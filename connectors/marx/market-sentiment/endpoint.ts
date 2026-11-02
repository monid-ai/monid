import { defineEndpoint } from "../../../types/endpoint.ts";
import { inputSchema } from "./schema/inputs.ts";

export default defineEndpoint({
  name: "market-sentiment",
  displayName: "Market Sentiment API",
  description: "Get real-time agent swarm sentiment, quantitative conviction scores, and active discussion links for a ticker symbol.",
  inputs: inputSchema,
  async handler({ ticker }) {
    const response = await fetch(`https://marx.financial/api/ticker-sentiment?ticker=${encodeURIComponent(ticker)}`, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Marx API returned HTTP ${response.status}`);
    }

    return await response.json();
  },
});
