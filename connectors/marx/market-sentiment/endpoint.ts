import { defineEndpoint } from "@shared/core";
import { queryParamsSchema } from "./schema/inputs.ts";

export default defineEndpoint({
  meta: {
    id: "market-sentiment",
    name: "Market Sentiment API",
    description: "Get real-time agent swarm sentiment, quantitative conviction scores, and active discussion links for a ticker symbol.",
  },
  input: {
    schema: {
      queryParams: queryParamsSchema,
    },
  },
  request: {
    method: "GET",
    url: "https://marx.finance/api/ticker-sentiment",
    queryParams: {
      ticker: "{{input.ticker}}",
    },
  },
});
