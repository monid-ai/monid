import { z } from "zod";

/**
 * johnvc/Google-Flights-Data-Scraper-Flight-and-Price-Search — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on 2026-09-22 via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const zGoogleFlightsDataScraperFlightAndPriceSearchOutputItem = z.object(
    {
        search_parameters: z.object({
            trip_type: z.number().int().describe(
                "1=Round trip, 2=One-way, 3=Multi-city",
            ).optional(),
            trip_type_description: z.string().describe("Trip Type Description")
                .optional(),
            departure_id: z.string().describe("Departure Airport Code(s)")
                .optional(),
            arrival_id: z.string().describe("Arrival Airport Code(s)")
                .optional(),
            outbound_date: z.string().describe("Outbound Date").optional(),
            return_date: z.string().describe("Return Date").optional(),
            multi_city_json: z.string().describe("Multi-City JSON").optional(),
            exclude_basic: z.boolean().describe("Exclude Basic Economy")
                .optional(),
            adults: z.number().int().describe("Number of Adults").optional(),
            children: z.number().int().describe("Number of Children")
                .optional(),
            infants: z.number().int().describe("Number of Infants").optional(),
            currency: z.string().describe("Currency Code").optional(),
            language: z.string().describe("Language Code").optional(),
            language_name: z.string().describe("Language Name").optional(),
            country: z.string().describe("Country Code").optional(),
            country_name: z.string().describe("Country Name").optional(),
            max_price: z.number().int().describe("Maximum Price").optional(),
            max_stops: z.number().int().describe("Maximum Stops").optional(),
            airlines: z.string().describe("Preferred Airlines").optional(),
        }).describe("Search Parameters").optional(),
        search_metadata: z.object({
            total_flights_found: z.number().int().describe(
                "Total Flights Found",
            ).optional(),
            best_flights_count: z.number().int().describe("Best Flights Count")
                .optional(),
            other_flights_count: z.number().int().describe(
                "Other Flights Count",
            ).optional(),
            pages_processed: z.number().int().describe("Pages Processed")
                .optional(),
            max_pages_set: z.number().int().describe("Maximum Pages Set")
                .optional(),
            pagination_limit_reached: z.boolean().describe(
                "Pagination Limit Reached",
            ).optional(),
            booking_options_count: z.number().int().describe(
                "Total number of individual booking options fetched across all booking tokens. Only present when fetch_booking_options is true.",
            ).optional(),
        }).describe("Search Metadata").optional(),
        search_timestamp: z.string().describe("Search Timestamp").optional(),
        page_number: z.number().int().describe("Current Page Number")
            .optional(),
        all_flights: z.array(z.object({
            category: z.enum(["best", "other"]).describe(
                "Whether this itinerary came from best_flights or other_flights.",
            ).optional(),
            price: z.number().int().describe(
                "Total price for this itinerary in the requested currency.",
            ).optional(),
            currency: z.string().describe(
                "Currency code for the price (e.g. USD).",
            ).optional(),
            airlines: z.string().describe(
                "Comma-separated list of operating airlines across all segments.",
            ).optional(),
            airline_logo: z.string().describe(
                "URL of the primary airline logo image.",
            ).optional(),
            route: z.string().describe(
                "Origin to destination airport codes, e.g. LAX-JFK.",
            ).optional(),
            departure_airport: z.string().describe(
                "IATA code of the first departure airport.",
            ).optional(),
            departure_time: z.string().describe(
                "Local departure time of the first segment.",
            ).optional(),
            arrival_airport: z.string().describe(
                "IATA code of the final arrival airport.",
            ).optional(),
            arrival_time: z.string().describe(
                "Local arrival time of the last segment.",
            ).optional(),
            stops: z.number().int().describe(
                "Number of layovers (0 = nonstop).",
            ).optional(),
            stops_label: z.string().describe(
                "Human-readable stop count, e.g. Nonstop, 1 stop, 2 stops.",
            ).optional(),
            layover_airports: z.string().describe(
                "Comma-separated IATA codes of layover airports.",
            ).optional(),
            duration_minutes: z.number().int().describe(
                "Total trip duration in minutes.",
            ).optional(),
            duration: z.string().describe(
                "Total trip duration, human-readable (e.g. 5h 30m).",
            ).optional(),
            travel_class: z.string().describe(
                "Cabin class of the first segment (e.g. Economy).",
            ).optional(),
            flight_numbers: z.string().describe(
                "Comma-separated flight numbers across all segments.",
            ).optional(),
            outbound_date: z.string().describe("Outbound date for this search.")
                .optional(),
            return_date: z.string().describe(
                "Return date for this search, if a round trip.",
            ).optional(),
            overnight: z.boolean().describe(
                "True if any segment is an overnight flight.",
            ).optional(),
            often_delayed: z.boolean().describe(
                "True if any segment is often delayed by over 30 minutes.",
            ).optional(),
            carbon_emissions_g: z.number().int().describe(
                "Estimated carbon emissions for this itinerary in grams.",
            ).optional(),
            booking_token: z.string().describe(
                "Opaque token identifying this itinerary for booking-option lookups.",
            ).optional(),
        })).describe(
            "Flat, one-row-per-flight summary of every itinerary on this page (best flights and other flights combined). Powers the Flights view so each flight renders as a single table row. The full nested itineraries remain available in best_flights and other_flights.",
        ).optional(),
        best_flights: z.array(z.object({
            flights: z.array(z.object({
                departure_airport: z.any().describe("Departure Airport")
                    .optional(),
                arrival_airport: z.any().describe("Arrival Airport").optional(),
                duration: z.any().describe("Flight Duration (minutes)")
                    .optional(),
                airplane: z.any().describe("Aircraft Type").optional(),
                airline: z.any().describe("Airline Name").optional(),
                airline_logo: z.any().describe("Airline Logo URL").optional(),
                travel_class: z.any().describe("Travel Class").optional(),
                flight_number: z.any().describe("Flight Number").optional(),
                legroom: z.any().describe("Legroom").optional(),
                extensions: z.any().describe("Flight Extensions").optional(),
                overnight: z.any().describe("Overnight Flight").optional(),
                ticket_also_sold_by: z.any().describe("Ticket Also Sold By")
                    .optional(),
                often_delayed_by_over_30_min: z.any().describe("Often Delayed")
                    .optional(),
                plane_and_crew_by: z.any().describe("Plane and Crew By")
                    .optional(),
            })).describe("Flight Segments").optional(),
            layovers: z.array(z.object({
                duration: z.any().describe("Layover Duration (minutes)")
                    .optional(),
                name: z.any().describe("Airport Name").optional(),
                id: z.any().describe("Airport Code").optional(),
            })).describe("Layovers").optional(),
            total_duration: z.number().int().describe(
                "Total Duration (minutes)",
            ).optional(),
            carbon_emissions: z.object({
                this_flight: z.number().int().describe("This Flight (grams)")
                    .optional(),
                typical_for_this_route: z.number().int().describe(
                    "Typical for Route (grams)",
                ).optional(),
                difference_percent: z.number().int().describe(
                    "Difference Percent",
                ).optional(),
            }).describe("Carbon Emissions").optional(),
            price: z.number().int().describe("Price").optional(),
            type: z.string().describe("Flight Type").optional(),
            airline_logo: z.string().describe("Airline Logo URL").optional(),
            extensions: z.array(z.string()).describe("Flight Extensions")
                .optional(),
            booking_token: z.string().describe("Booking Token").optional(),
            departure_token: z.string().describe("Departure Token").optional(),
        })).describe("Best Flights").optional(),
        other_flights: z.array(z.object({
            flights: z.array(z.record(z.string(), z.any())).describe(
                "Flight Segments",
            ).optional(),
            layovers: z.array(z.record(z.string(), z.any())).describe(
                "Layovers",
            ).optional(),
            total_duration: z.number().int().describe(
                "Total Duration (minutes)",
            ).optional(),
            carbon_emissions: z.record(z.string(), z.any()).describe(
                "Carbon Emissions",
            ).optional(),
            price: z.number().int().describe("Price").optional(),
            type: z.string().describe("Flight Type").optional(),
            airline_logo: z.string().describe("Airline Logo URL").optional(),
            extensions: z.array(z.string()).describe("Flight Extensions")
                .optional(),
            booking_token: z.string().describe("Booking Token").optional(),
            departure_token: z.string().describe("Departure Token").optional(),
        })).describe("Other Flights").optional(),
        price_insights: z.object({
            lowest_price: z.number().int().describe("Lowest Price").optional(),
            price_level: z.string().describe("Price Level").optional(),
            typical_price_range: z.array(z.number().int()).describe(
                "Typical Price Range",
            ).optional(),
        }).describe("Price Insights").optional(),
        airports: z.array(z.object({
            departure: z.array(z.object({
                airport: z.any().describe("Airport").optional(),
                city: z.any().describe("City").optional(),
                country: z.any().describe("Country").optional(),
                country_code: z.any().describe("Country Code").optional(),
                image: z.any().describe("Airport Image URL").optional(),
            })).describe("Departure Airports").optional(),
            arrival: z.array(z.object({
                airport: z.any().describe("Airport").optional(),
                city: z.any().describe("City").optional(),
                country: z.any().describe("Country").optional(),
                country_code: z.any().describe("Country Code").optional(),
                image: z.any().describe("Airport Image URL").optional(),
            })).describe("Arrival Airports").optional(),
        })).describe("Airports Information").optional(),
        booking_options: z.array(z.record(z.string(), z.any())).describe(
            "Booking Options",
        ).optional(),
    },
);
/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object — validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const zGoogleFlightsDataScraperFlightAndPriceSearchOutput = z.array(
    zGoogleFlightsDataScraperFlightAndPriceSearchOutputItem.or(
        z.record(z.string(), z.unknown()),
    ),
);
