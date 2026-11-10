import { defineEndpoint, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zModelsQueryParams } from "./schema/inputs.ts";

/**
 * AI/ML API `GET /v1/models` — the live model roster, free.
 *
 * WHY this endpoint exists: the gateway's ids are vendor-prefixed and the
 * roster moves constantly (932 rows on 2026-10-15), so no doc in this
 * connector pins a model name. `aimlapi#chat/completions` and
 * `aimlapi#images/generations` take whatever id the caller read here.
 *
 * WHY the output is projected: one unfiltered call returns ~510 KB mixing
 * every endpoint family, and the ONLY thing that distinguishes them is the
 * `type` field:
 *   - `openai/chat-completions` (365 rows) and `anthropic/messages` (30) —
 *     both callable at `/chat/completions`, so they are ONE chat family;
 *   - `openai/image-generations` (125) — callable at
 *     `/images/generations`;
 *   - `internal/*`, `openai/embeddings`, `openai/responses/submit`,
 *     `anthropic/batches*`, … — neither, and not callable through this
 *     connector.
 * A model id may appear ONCE PER FAMILY, so the two chat types must be
 * MERGED BY ID, not concatenated: the 395 chat-family rows collapse to 365
 * distinct ids (verified live 2026-10-15 — every `anthropic/messages` id
 * is also published as `openai/chat-completions`). `fromResponse` does
 * exactly that and keeps each row's own label, developer and docs link.
 *
 * The gateway's own `?type=` filter is deliberately NOT exposed: it takes
 * ONE type, and one engine run is one request, so a caller-chosen type
 * would make the two-type chat family unrepresentable and silently empty
 * the arrays this endpoint's output contract promises.
 *
 * PRICES. `?include=pricing` is pinned at the binding (the vendor's
 * full set of expansions is mirrored in `schema/inputs.ts`), because the gateway publishes a full rate card on
 * this same endpoint and it is the only machine-readable one it has: every
 * row then carries `pricing: {currency, kind, units[], thresholds[],
 * dimensions[], variants[], variable}`, each unit a `price` over a `per`.
 * The projection normalizes that to the price of ONE unit (`price / per`)
 * and names the two rates a caller actually chooses a model on — input and
 * output per 1M tokens for chat, per-image for image models.
 *
 * Three shapes in that card the projection does NOT flatten, and says so
 * through `kind` and `variable` rather than guessing:
 *   - `kind: "variants"` (e.g. `x-ai/grok-imagine-image-2.0`) prices the
 *     unit through a `variants[]` matrix over `dimensions[]` and leaves
 *     `price: null` on the unit itself — the flat number is then `null`,
 *     not zero;
 *   - `thresholds[]` are volume tiers, so a published unit price is the
 *     headline rate rather than the only one;
 *   - a model may publish SEVERAL units of one name (tool `call` tiers,
 *     cache reads and writes). `units` keeps every priced one; the two
 *     named rates take the first match, which is the headline.
 */
export default defineEndpoint({
    meta: {
        displayName: "AI/ML API Models",
        summary: "List the chat and image models this gateway can serve, " +
            "live.",
        description: "Read AI/ML API's live model roster and get back the " +
            "ids that are actually callable through this connector, split " +
            "by family: `chat` (usable with " +
            "`aimlapi#chat/completions`) and `image` (usable with " +
            "`aimlapi#images/generations`), each entry carrying the id, " +
            "the display name, the developer, the context length where " +
            "published, the model's own docs link and its PRICE as the " +
            "gateway publishes it. The gateway mixes " +
            "every endpoint family into one list and distinguishes them " +
            "only by an internal `type`, with the same id appearing under " +
            "more than one type — this endpoint resolves that and " +
            "de-duplicates. Free: no credits, and the underlying call " +
            "needs no key.",
        docsUrl: "https://docs.aimlapi.com/api-references/model-database",
        categories: ["text-generation", "image-generation"],
        notes: [
            "Free — the gateway bills nothing for the roster and reports " +
            "no meter on it.",
            "The upstream call works without a key; the connector still " +
            "sends one, because auth is where this provider attaches its " +
            "attribution headers.",
            "`counts.chatRows`/`counts.imageRows` are the raw row counts " +
            "and `counts.chat`/`counts.image` the de-duplicated ones — " +
            "when they differ, an id was published under two types.",
            "Prices come from the gateway's own card and are per ONE " +
            "unit, with `inputUsdPerMTok`/`outputUsdPerMTok` on chat rows " +
            "and `usdPerImage` on image rows. They are the headline rate: " +
            "`pricing.kind` and `pricing.variable` say when a model " +
            "prices through a variant matrix instead (then the flat " +
            "number is `null`) or carries volume thresholds.",
        ],
    },
    request: { method: "GET", path: "/models" },
    input: {
        schema: {
            // The vendor accepts several expansions (see schema/inputs.ts);
            // this endpoint's output is built on exactly ONE of them, so the
            // binding pins it. `all` would triple the payload (1.66 MB against
            // 0.52 MB bare) for fields nothing here projects, and the default
            // means a caller never has to pass it — the binding materializes
            // it on the wire.
            queryParams: zModelsQueryParams.extend({
                include: z.literal("pricing").default("pricing").describe(
                    "Gateway expansion to request. Only `pricing` is " +
                        "accepted here: it is what makes each row carry " +
                        "its rate card, and it is the expansion this " +
                        "endpoint's output is built on.",
                ),
            }),
        },
    },
    usage: { model: { kind: UsageModelKind.FREE } },
    output: {
        /**
         * Project the roster onto the two families this connector can
         * call, merging by id. `type` is the only discriminator the
         * gateway gives, and it is NOT a prefix test: `openai/embeddings`
         * and `openai/responses/submit` share the `openai/` prefix with
         * `openai/chat-completions` and are not chat.
         */
        fromResponse: ({ data, utils }) => {
            const rows = utils.json.optionalGet(data.output, "$.data");
            const chat = [];
            const image = [];
            const chatIds: string[] = [];
            const imageIds: string[] = [];
            let chatRows = 0;
            let imageRows = 0;
            if (Array.isArray(rows)) {
                for (const row of rows) {
                    if (
                        typeof row !== "object" || row === null ||
                        Array.isArray(row)
                    ) continue;
                    const id = row.id;
                    const type = row.type;
                    if (typeof id !== "string" || typeof type !== "string") {
                        continue;
                    }
                    const isChat = type === "openai/chat-completions" ||
                        type === "anthropic/messages";
                    const isImage = type === "openai/image-generations";
                    if (!isChat && !isImage) continue;
                    if (isChat) chatRows += 1;
                    else imageRows += 1;
                    const seen = isChat ? chatIds : imageIds;
                    if (seen.includes(id)) continue;
                    seen.push(id);
                    const info = row.info;
                    const described = typeof info === "object" &&
                        info !== null && !Array.isArray(info);
                    // The vendor's card, normalized to the price of ONE
                    // unit. A unit with no numeric price is DROPPED rather
                    // than read as free — that is the `kind: "variants"`
                    // shape, where the price lives in `variants[]` and the
                    // `variable` flag below is what says so.
                    const card = row.pricing;
                    const priced = typeof card === "object" &&
                        card !== null && !Array.isArray(card);
                    const rawUnits = priced && Array.isArray(card.units)
                        ? card.units
                        : [];
                    const units: {
                        name: string | null;
                        origin: string | null;
                        usdPerUnit: number;
                    }[] = [];
                    for (const raw of rawUnits) {
                        if (
                            typeof raw !== "object" || raw === null ||
                            Array.isArray(raw)
                        ) continue;
                        const price = raw.price;
                        const per = raw.per;
                        if (
                            typeof price !== "number" ||
                            typeof per !== "number" || per <= 0
                        ) continue;
                        units.push({
                            name: typeof raw.name === "string"
                                ? raw.name
                                : null,
                            origin: typeof raw.origin === "string"
                                ? raw.origin
                                : null,
                            usdPerUnit: price / per,
                        });
                    }
                    // First match is the HEADLINE rate: a model may publish
                    // several units of one name (tool `call` tiers), and
                    // `units` above keeps all of them.
                    const rate = (
                        name: string,
                        origin: string,
                        scale: number,
                    ) => {
                        for (const unit of units) {
                            if (unit.name === name && unit.origin === origin) {
                                return unit.usdPerUnit * scale;
                            }
                        }
                        return null;
                    };
                    const pricing = {
                        currency: priced && typeof card.currency === "string"
                            ? card.currency
                            : null,
                        // `fixed` | `variable` | `variants` — the vendor's
                        // own word for how the price is formed
                        kind: priced && typeof card.kind === "string"
                            ? card.kind
                            : null,
                        // true ⇒ the flat numbers below are not the whole
                        // price: it moves with the request (size, variant)
                        variable: priced && card.variable === true,
                        // volume tiers exist ⇒ a flat number is the
                        // headline, not the only rate
                        tiered: priced && Array.isArray(card.thresholds) &&
                            card.thresholds.length > 0,
                        units,
                    };
                    const entry = {
                        id,
                        name: described && typeof info.name === "string"
                            ? info.name
                            : id,
                        developer:
                            described && typeof info.developer === "string"
                                ? info.developer
                                : null,
                        contextLength: described &&
                                typeof info.contextLength === "number"
                            ? info.contextLength
                            : null,
                        docsUrl: described && typeof info.docsUrl === "string"
                            ? info.docsUrl
                            : null,
                    };
                    if (isChat) {
                        chat.push({
                            ...entry,
                            pricing: {
                                ...pricing,
                                // the two rates a chat model is chosen on,
                                // in the unit the vendor publishes them in
                                inputUsdPerMTok: rate(
                                    "token",
                                    "provided",
                                    1_000_000,
                                ),
                                outputUsdPerMTok: rate(
                                    "token",
                                    "generated",
                                    1_000_000,
                                ),
                            },
                        });
                    } else {
                        image.push({
                            ...entry,
                            pricing: {
                                ...pricing,
                                // per-generation price where the model
                                // publishes one; null for the megapixel-
                                // and token-priced models, whose charge
                                // scales with a size this roster does not
                                // know
                                usdPerImage: rate("generation", "generated", 1),
                            },
                        });
                    }
                }
            }
            return {
                counts: {
                    chat: chat.length,
                    chatRows,
                    image: image.length,
                    imageRows,
                },
                chat,
                image,
            };
        },
    },
});
