import { testEndpoint } from "@shared/testing";
import endpoint from "./endpoint.ts";

testEndpoint(endpoint, {
  fixture: "./fixtures/nvda.json",
  input: {
    ticker: "NVDA",
  },
});
