import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { env } from "../config/env";
import { logger } from "../utils/logger";

interface NearbyToolParams {
    client_id: string;
    lat?: number;
    long?: number;
}

export const createNearbyTool = (params: NearbyToolParams) => {
    const { client_id, lat = 19.571749, long = 74.223877 } = params;
    const apiUrl = env.NEARBY_SERVICE_URL;

    return new DynamicStructuredTool({
        name: "nearby_service_tool",
        description: "Search for nearby services or businesses in Sangamner based on a query. Use this to find hospitals, shops, restaurants, etc.",
        schema: z.object({
            query: z.string().describe("The search query for the place or service"),
        }),
        func: async (input: { query: string }) => {
            const { query } = input;
            logger.info({ query, lat, long, client_id }, "Nearby tool called");

            const payload = {
                query,
                lat,
                long,
                client_id,
                page: 1,
                limit: 3
            };

            try {
                logger.info(`Sending request to Nearby Service API: ${apiUrl}`);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`API request failed with status ${response.status}`);
                }

                const data = await response.json();
                logger.info("Received response from Nearby Service API");

                let rawResult = data.result || data.results || [];
                if (!Array.isArray(rawResult)) {
                    rawResult = [rawResult];
                }

                // Enforce limit of 3 results
                if (rawResult.length > 3) {
                    rawResult = rawResult.slice(0, 3);
                }

                if (rawResult.length === 0) {
                    logger.info("No results found in API response.");
                    return "No results found.";
                }

                const results = rawResult.map((item: any) => ({
                    id: item.business_id || item.id || "",
                    name: item.business_name || item.name || "",
                    address: `${item.city || ""}, ${item.pincode || ""}`,
                    phone: item.phone || item.phone_number || "",
                    distance_km: item.distance_km || item.distance || 0,
                    rating: item.rating || 0.0
                }));

                logger.info(`Returning ${results.length} nearby results.`);
                return JSON.stringify(results);

            } catch (error: any) {
                if (error.name === 'AbortError') {
                    logger.error("Nearby service timeout");
                    return "Nearby service timeout - try again later.";
                }
                logger.error(error, "Error connecting to nearby service");
                return `Error connecting to nearby service: ${error.message}`;
            }
        },
    });
};
