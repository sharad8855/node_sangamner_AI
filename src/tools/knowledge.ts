import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { env } from "../config/env";
import { logger } from "../utils/logger";

interface KnowledgeToolParams {
    client_id: string;
}

export const createKnowledgeTool = (params: KnowledgeToolParams) => {
    const { client_id } = params;
    const apiUrl = env.KNOWLEDGE_SERVICE_URL;

    return new DynamicStructuredTool({
        name: "sangamner_knowledge_tool",
        description: "Get general knowledge and information about Sangamner city, its history, culture, and general facts. Use this for general queries about the city that are not specific location searches.",
        schema: z.object({
            query: z.string().describe("The user's question about Sangamner"),
        }),
        func: async (input: { query: string }) => {
            const { query } = input;
            logger.info({ query, client_id }, "Knowledge tool called");

            const payload = {
                client_id: client_id,
                ask: query,
                top_k: 3,
                top_p: 0.35,
                history: []
            };

            try {
                logger.info(`Sending request to Knowledge API: ${apiUrl}`);
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
                    throw new Error(`Knowledge API request failed with status ${response.status}`);
                }

                const data = await response.json();
                logger.info("Received response from Knowledge API");

                // Return the data as JSON string for the LLM
                return JSON.stringify(data);

            } catch (error: any) {
                if (error.name === 'AbortError') {
                    logger.error("Knowledge service timeout");
                    return "Knowledge service timeout - try again later.";
                }
                logger.error(error, "Error connecting to knowledge service");
                return `Error connecting to knowledge service: ${error.message}`;
            }
        },
    });
};
