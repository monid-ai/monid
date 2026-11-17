# Parallel connector decisions

## D1: Preserve MCP sessions during recording and redact them before persistence

MCP initialization can return an `mcp-session-id` response header that subsequent
requests must echo. The shared fixture recorder returns only allowlisted response
headers to the running connector, so dropping this header also breaks the live
session being recorded. Replay fixtures need the header to exercise the same
session and cleanup behavior.

Allow `mcp-session-id` in `RECORDED_RES_HEADERS` and replace its value with
`fixture-session` in `scrubCalls` before writing fixtures. Keep the live value in
the response returned to the connector. This is a protocol header rule shared by
MCP providers; it does not depend on Parallel's host or tool names. Request headers
remain excluded, and other response headers still require explicit allowlisting.

The shared recorder change and its regression test are isolated in a prerequisite
commit. The test verifies that execution receives the live session, disallowed
headers are dropped, and the persisted fixture contains only the placeholder.
The connector commit builds on that support and replays recorded search and fetch
sessions. Engine behavior, endpoint document format and hook ABI do not change.
