# Parallel Search MCP

Free web search and page extraction with no Parallel account or API key. Search
uses Fast mode on the anonymous
[Search MCP endpoint](https://docs.parallel.ai/integrations/mcp/search-mcp). The
free tier is rate limited and intended for exploration and light use.

From the repository root, with Deno 2.x installed:

```bash
deno task check && deno task test
deno task catalog inspect 'parallel#search'
deno task engine:run 'parallel#search' --body '{"objective":"Find the official Deno 2 release announcement","search_queries":["Deno 2 release official"],"session_id":"5b160d4d-4dce-4ed3-a459-2eafdd467a47"}'
deno task engine:run 'parallel#fetch' --body '{"urls":["https://deno.com/blog/v2.0"],"objective":"Deno 2 release features","session_id":"5b160d4d-4dce-4ed3-a459-2eafdd467a47"}'
```

Generate a new `session_id` once per conversation and reuse it for related
search and fetch calls. `model_name` is optional; supply the exact runtime model
identifier only when known. `parallel#fetch` accepts up to 20 HTTP/HTTPS URLs,
an optional objective (up to 200 characters), `search_queries`, `full_content`
and `allow_live_fetch`. Prefer focused excerpts; full markdown can be large.
Fetch returns successful results and per-URL errors.

The connector returns each tool's `structuredContent` directly. Both endpoints
use the FREE usage model and do not forward vendor credentials. Each engine run
opens its own Streamable HTTP MCP session and terminates it best-effort. JSON
and finite SSE POST replies are supported. There is no persistent stream, SSE
reconnection or automatic retry. Request timeout is 30 seconds.

Replay tests run offline. The two success fixtures are trimmed recordings of
anonymous calls on 2026-10-11, with transport session IDs replaced by a fixed
placeholder. Protocol failures and SSE responses use synthetic test responses.
