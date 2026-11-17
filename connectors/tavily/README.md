# Tavily

Search the web, extract page content, crawl websites, discover URLs, and run
research with Tavily through Monid.

## Tools

| Tool                           | Description                                                            |
| ------------------------------ | ---------------------------------------------------------------------- |
| `tavily#search`                | Search the web with ranked results, source URLs, and optional answers. |
| `tavily#extract`               | Extract content from one URL or a batch of up to 20 URLs.              |
| `tavily#crawl`                 | Explore a website and extract content from its pages.                  |
| `tavily#map`                   | Discover URLs on a website.                                            |
| `tavily#research`              | Generate a cited research report or structured output.                 |
| `tavily#research/{request_id}` | Retrieve an existing research task's status and report.                |

## Setup

Get an API key from [Tavily](https://app.tavily.com) and add it to the
repository's ignored `.env` file:

```dotenv
TAVILY_CREDENTIALS_API_KEY=YOUR_API_KEY
```

The examples below use Deno 2 and run from the Monid repository root.

## Examples

### Search

```bash
deno task --env-file=.env engine:run 'tavily#search' \
  --body '{"query":"Latest developments in solid-state batteries","max_results":5,"search_depth":"advanced","include_answer":true}'
```

### Extract

```bash
deno task --env-file=.env engine:run 'tavily#extract' \
  --body '{"urls":["https://docs.tavily.com"],"format":"markdown"}'
```

### Crawl

Set `limit` to the maximum number of pages to process.

```bash
deno task --env-file=.env engine:run 'tavily#crawl' \
  --body '{"url":"https://docs.tavily.com","limit":10,"max_depth":2,"extract_depth":"basic"}'
```

### Map

```bash
deno task --env-file=.env engine:run 'tavily#map' \
  --body '{"url":"https://docs.tavily.com","limit":20,"max_depth":2}'
```

### Research

Use `mini` for focused questions, `pro` for comprehensive research, or `auto` to
let Tavily choose. The command waits for the completed report.

```bash
deno task --env-file=.env engine:run 'tavily#research' \
  --body '{"input":"Summarize recent progress in solid-state battery manufacturing, with sources.","model":"mini","output_length":"short"}'
```

Retrieve the report again using the returned `request_id`:

```bash
deno task --env-file=.env engine:run 'tavily#research/{request_id}' \
  --path-params '{"request_id":"YOUR_REQUEST_ID"}'
```

## Parameters and usage

Inspect a tool's available parameters:

```bash
deno task catalog inspect 'tavily#search'
```

Responses include usage in Tavily API credits. Reading an existing research
report does not incur another research charge. See
[Tavily's credits documentation](https://docs.tavily.com/documentation/api-credits)
for pricing.

For API parameters and examples, see the
[Tavily documentation](https://docs.tavily.com).
