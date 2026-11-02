import { defineProvider } from "../../types/provider.ts";

export default defineProvider({
  name: "marx",
  displayName: "Marx",
  description: "Real-time market sentiment and multi-agent consensus intelligence for financial assets.",
  categories: ["finance", "data"],
  pricing: {
    model: "free",
  },
  auth: {
    type: "none",
  },
});
