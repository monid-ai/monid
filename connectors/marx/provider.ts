import { defineProvider } from "@shared/core";

export default defineProvider({
  meta: {
    id: "marx",
    name: "Marx",
    description: "Real-time market sentiment and multi-agent consensus intelligence for financial assets.",
  },
  auth: {
    inject: "header",
    credentials: {
      apiKey: {
        type: "string",
        header: "x-api-key",
        required: false,
      },
    },
  },
  usage: {
    model: "free",
  },
});
