import { z } from "zod";

/**
 * johnvc/google-scholar-api — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on 2026-09-22 via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const zGoogleScholarApiOutputItem = z.object({
    _mode: z.string().describe("Mode").optional(),
    _query_index: z.number().int().describe("Page Number or Call Index")
        .optional(),
    search_parameters: z.object({
        mode: z.string().describe("Mode").optional(),
        q: z.string().describe("Query").optional(),
        author_id: z.string().describe("Author ID").optional(),
        result_id: z.string().describe("Result ID").optional(),
        citation_id: z.string().describe("Citation ID").optional(),
        cites: z.string().describe("Cites").optional(),
        cluster: z.string().describe("Cluster").optional(),
        hl: z.string().describe("UI Language").optional(),
        lr: z.string().describe("Language Restriction").optional(),
        as_ylo: z.number().int().describe("Min Year").optional(),
        as_yhi: z.number().int().describe("Max Year").optional(),
        scisbd: z.string().describe("Sort By Date").optional(),
        as_sdt: z.string().describe("Search Filter").optional(),
        safe: z.string().describe("Safe Search").optional(),
        filter: z.string().describe("Filter Similar").optional(),
        as_vis: z.string().describe("Include Citations").optional(),
        as_rr: z.string().describe("Review Only").optional(),
        sort: z.string().describe("Sort").optional(),
        max_pages: z.number().int().describe("Max Pages").optional(),
        num: z.number().int().describe("Per Page").optional(),
    }).describe("Search Parameters").optional(),
    search_metadata_status: z.string().describe("API Response Status")
        .optional(),
    search_timestamp: z.string().describe("Search Timestamp").optional(),
    position: z.number().int().describe("Position On Page").optional(),
    result_id: z.string().describe("Paper Result ID").optional(),
    paper_title: z.string().describe("Paper Title").optional(),
    link: z.string().describe("Paper URL").optional(),
    snippet: z.string().describe("Snippet").optional(),
    case_id: z.string().describe("Case ID").optional(),
    publication_info: z.object({
        summary: z.string().describe("Summary").optional(),
        authors: z.array(z.object({
            name: z.string().describe("Name").optional(),
            link: z.string().describe("Profile URL").optional(),
            author_id: z.string().describe("Author ID").optional(),
        })).describe("Authors").optional(),
    }).describe("Publication Info").optional(),
    resources: z.array(z.object({
        title: z.string().describe("Title").optional(),
        file_format: z.string().describe("File Format").optional(),
        link: z.string().describe("Link").optional(),
    })).describe("Resource Links").optional(),
    inline_links: z.object({
        cited_by_total: z.number().int().describe("Cited By Total")
            .optional(),
        cited_by_link: z.string().describe("Cited By URL").optional(),
        cited_by_cites_id: z.string().describe("Cites ID").optional(),
        versions_total: z.number().int().describe("Versions Total")
            .optional(),
        versions_link: z.string().describe("Versions URL").optional(),
        versions_cluster_id: z.string().describe("Cluster ID").optional(),
        related_pages_link: z.string().describe("Related Pages URL")
            .optional(),
        cached_page_link: z.string().describe("Cached Page URL").optional(),
    }).describe("Inline Links").optional(),
    style: z.string().describe("Citation Style").optional(),
    text: z.string().describe("Formatted Citation Text").optional(),
    export_links: z.array(z.object({
        name: z.string().describe("Format Name").optional(),
        link: z.string().describe("Link").optional(),
    })).describe("Bibliography Export Links").optional(),
    author: z.object({
        name: z.string().describe("Name").optional(),
        affiliations: z.string().describe("Affiliations").optional(),
        email: z.string().describe("Email Domain").optional(),
        website: z.string().describe("Website").optional(),
        thumbnail: z.string().describe("Photo URL").optional(),
        interests: z.array(z.object({
            title: z.string().describe("Topic").optional(),
            link: z.string().describe("Topic URL").optional(),
        })).describe("Interests").optional(),
    }).describe("Author").optional(),
    cited_by_summary: z.object({
        citations_all: z.number().int().describe("Citations (All)")
            .optional(),
        citations_recent: z.number().int().describe("Citations (Recent)")
            .optional(),
        h_index_all: z.number().int().describe("h-index (All)").optional(),
        h_index_recent: z.number().int().describe("h-index (Recent)")
            .optional(),
        i10_index_all: z.number().int().describe("i10-index (All)")
            .optional(),
        i10_index_recent: z.number().int().describe("i10-index (Recent)")
            .optional(),
        recent_since_year: z.number().int().describe(
            "Recent Window Start Year",
        ).optional(),
    }).describe("Citation Metrics").optional(),
    cited_by_graph: z.array(z.object({
        year: z.number().int().describe("Year").optional(),
        citations: z.number().int().describe("Citations").optional(),
    })).describe("Citations Per Year").optional(),
    public_access: z.object({
        link: z.string().describe("Mandate URL").optional(),
        available: z.number().int().describe("Articles Available").optional(),
        not_available: z.number().int().describe("Articles Not Available")
            .optional(),
    }).describe("Public Access").optional(),
    co_authors_preview: z.array(z.object({
        name: z.string().describe("Name").optional(),
        author_id: z.string().describe("Author ID").optional(),
        affiliations: z.string().describe("Affiliations").optional(),
        email: z.string().describe("Email Domain").optional(),
    })).describe("Co-Authors Preview").optional(),
    articles_preview: z.array(z.object({
        title: z.string().describe("Title").optional(),
        citation_id: z.string().describe("Citation ID").optional(),
        year: z.string().describe("Year").optional(),
        cited_by_value: z.number().int().describe("Citations").optional(),
    })).describe("Articles Preview").optional(),
    article_position: z.number().int().describe("Article Position")
        .optional(),
    citation_id: z.string().describe("Citation ID").optional(),
    authors: z.string().describe("Authors String").optional(),
    publication: z.string().describe("Publication Venue").optional(),
    year: z.string().describe("Year").optional(),
    cited_by_value: z.number().int().describe("Cited By Count").optional(),
    cited_by_link: z.string().describe("Cited By URL").optional(),
    publication_date: z.string().describe("Publication Date").optional(),
    journal: z.string().describe("Journal").optional(),
    volume: z.string().describe("Volume").optional(),
    issue: z.string().describe("Issue").optional(),
    pages: z.string().describe("Pages").optional(),
    publisher: z.string().describe("Publisher").optional(),
    paper_description: z.string().describe("Description / Abstract")
        .optional(),
    total_citations_all: z.number().int().describe("Total Citations")
        .optional(),
    total_citations_link: z.string().describe("Total Citations URL")
        .optional(),
    citation_by_year: z.array(z.object({
        year: z.number().int().describe("Year").optional(),
        citations: z.number().int().describe("Citations").optional(),
    })).describe("Citation By Year").optional(),
    scholar_articles: z.array(z.object({
        title: z.string().describe("Title").optional(),
        link: z.string().describe("Link").optional(),
        authors: z.string().describe("Authors").optional(),
        cited_by_value: z.number().int().describe("Citations").optional(),
    })).describe("Related Scholar Articles").optional(),
    coauthor_name: z.string().describe("Co-Author Name").optional(),
    coauthor_link: z.string().describe("Co-Author Profile URL").optional(),
    coauthor_author_id: z.string().describe("Co-Author ID").optional(),
    coauthor_affiliations: z.string().describe("Co-Author Affiliations")
        .optional(),
    coauthor_email: z.string().describe("Co-Author Email Domain").optional(),
    coauthor_thumbnail: z.string().describe("Co-Author Photo URL").optional(),
    error: z.boolean().describe("Error Flag").optional(),
    error_message: z.string().describe("Error Message").optional(),
    error_type: z.string().describe("Error Type").optional(),
});
/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object — validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const zGoogleScholarApiOutput = z.array(
    zGoogleScholarApiOutputItem.or(z.record(z.string(), z.unknown())),
);
