import { assertEquals } from "@std/assert";
import { directTransport, Engine } from "@monid/connector-engine";
import type { Json } from "@shared/core";
import { loadFixture, testSealedUnit } from "@shared/testing";
import { fromFileUrl } from "@std/path";

// Complete requests from the documented REST surface, not the smaller MCP
// surface. Exercise the compiled schemas and transport: accepting a property
// in a source mirror alone does not prove that the vendor receives it.
const traversal = {
    url: "https://docs.tavily.com",
    instructions: "Find API documentation",
    max_depth: 2,
    max_breadth: 5,
    limit: 3,
    select_paths: ["/documentation/.*"],
    select_domains: ["^docs\\.tavily\\.com$"],
    exclude_paths: ["/private/.*"],
    exclude_domains: ["^private\\.tavily\\.com$"],
    allow_external: false,
    timeout: 120.5,
    include_usage: false,
};
const extraction = {
    extract_depth: "advanced",
    chunks_per_source: 2,
    format: "text",
    include_images: true,
    include_favicon: true,
};
const requests: Record<string, Record<string, Json>> = {
    search: {
        query: '"Tavily" API',
        search_depth: "advanced",
        chunks_per_source: 2,
        max_results: 3,
        topic: "general",
        time_range: "year",
        start_date: "2026-01-01",
        end_date: "2026-10-26",
        include_published_date: true,
        filter_by_published_date: true,
        include_answer: "advanced",
        include_raw_content: "text",
        include_images: true,
        include_image_descriptions: true,
        include_favicon: true,
        include_domains: ["tavily.com"],
        exclude_domains: ["example.com"],
        include_domains_mode: "prefer",
        country: "united states",
        language: "en",
        filter_by_language: true,
        auto_parameters: true,
        exact_match: true,
        include_usage: false,
        safe_search: true,
    },
    extract: {
        urls: ["https://docs.tavily.com", "https://example.com"],
        query: "API capabilities",
        ...extraction,
        timeout: 45.5,
        include_usage: false,
    },
    crawl: { ...traversal, ...extraction },
    map: traversal,
};

for (const [endpoint, body] of Object.entries(requests)) {
    Deno.test(`tavily#${endpoint}: every documented option survives schema and transport`, async () => {
        const unit = await testSealedUnit(`tavily#${endpoint}`);
        const fixture = await loadFixture(fromFileUrl(
            new URL(`./fixtures/synthetic-${endpoint}.json`, import.meta.url),
        ));
        let calls = 0;
        const loaded = await new Engine({
            transport: directTransport({
                params: () => Promise.resolve({ apiKey: "test-key" }),
                fetch: (url, init) => {
                    calls++;
                    assertEquals(
                        String(url),
                        `https://api.tavily.com/${endpoint}`,
                    );
                    assertEquals(JSON.parse(String(init?.body)), {
                        ...body,
                        // Settlement owns this field even when the caller says false.
                        include_usage: true,
                    });
                    return Promise.resolve(
                        new Response(
                            JSON.stringify(fixture.calls[0].res.body),
                        ),
                    );
                },
            }),
        }).load(unit);
        await loaded.run({ body });
        assertEquals(calls, 1);
    });
}
