# Capability/option map — 2026-10-23

This supplements the five-product, 22-endpoint inventory. No supported input is
removed for easier testing. Native response fields remain under
provider_response.

| Capability            | Binding / evidence                                                                                                                              | Behavior                                                                                                                                                                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gemini shopping       | Boolean true/false/omitted; documented default false and answer + 0/1 enhancement.                                                              | Preserves native output; declared usage follows returned data rather than parsing answer text into new fields.                                                                                                                      |
| TikTok cursor/count   | String cursor passed unchanged; positive integer count; native 1/2 item samples.                                                                | One invocation fetches one vendor response; input values and returned fields are preserved without automatic extra requests.                                                                                                        |
| Rufus ASIN            | Same question with/without ASIN independently recorded.                                                                                         | Product-aware answer observed; no persistent conversation-session claim. Send ASIN on each independent request.                                                                                                                     |
| Rufus is_get_question | True/false native comparison; true adds result.products[].related_questions.                                                                    | Top-level result.related_questions is not the per-product switch and appeared for both values. Fields are preserved, not filtered.                                                                                                  |
| Rufus is_sse_data     | True/false native comparison; true adds upstream event text in JSON html.                                                                       | HTTP response is application/json. Supports buffered event data, not a claimed Monid event-stream executor.                                                                                                                         |
| AI Mode prompt/share  | Short link failed directly; its full Google redirect target succeeded natively. Binding now expands known share redirects before its sole POST. | At most three allowlisted bare Google reads; all share parameters retained. Missing/foreign/cyclic/failed redirects create no task. Compiled mixed synthetic-redirect/native-API regression is explicit, not production live proof. |
| AI Mode URL-only      | Public /search?udm=50&q=... success retained; URL-only schema accepts complete URL forms.                                                       | Not a universal URL success guarantee; prompt/location/etc cannot be combined with URL-only in this binding.                                                                                                                        |
| Google batch          | Web, Images, Local, Videos, Shopping, News: six registered IDs, native success fixtures and vendor README support.                              | Docs lists five dedicated pages; News also appears in parameter guide/README and native success. Count does not describe every Google service.                                                                                      |

Primary references:

- [Gemini](https://docs.scrapeless.com/en/docs/ai-scraper/scrapers/gemini/)
- [TikTok](https://docs.scrapeless.com/en/docs/scraping-api/tiktok-scraper/endpoints/)
- [Rufus parameter intent](https://www.scrapeless.com/en/blog/scrapeless-weekly-changelog-july-27-august-02-2026)
  and
  [ASIN behavior](https://www.scrapeless.com/en/blog/amazon-rufus-product-aware)
- [AI Mode](https://docs.scrapeless.com/en/docs/ai-scraper/scrapers/google-ai-mode/)
- [Google vendor README](https://github.com/scrapeless-ai/google-scraper) and
  [parameter reference](https://apidocs.scrapeless.com/doc-800321)

A public document, a native result, a synthetic regression, a list-rate fold and
a supplier invoice are distinct kinds of evidence. Catalog publication and
production acceptance have not happened.
