import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent } from "langchain";
import NodeCache from 'node-cache';  // npm i node-cache
import { getTools } from "../tools";
import { logger } from "../utils/logger";
import { intentClassifier } from "./intent";

const searchCache = new NodeCache({ stdTTL: 600 });
const chatModel = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",  // ✅ Your working model
    temperature: 0,
    maxRetries: 1, // 15s max
    apiKey: process.env.GEMINI_API_KEY,
});


interface RunAgentParams {
    input: string;
    client_id: string;
    lat?: number;
    long?: number;
    live?: boolean;
}

enum Intent {
    LIVE_SEARCH = "LIVE_SEARCH",
    NEARBY = "NEARBY",
    KNOWLEDGE = "KNOWLEDGE",
    CHAT = "CHAT"
}

async function runLiveSearch(input: string) {
    const cacheKey = `search:${input.toLowerCase()}`;
    if (searchCache.has(cacheKey)) {
        logger.info("🎯 CACHE HIT - instant!");
        return searchCache.get(cacheKey) as any;
    }

    logger.info("🔍 Searching...");
    const searchTool = { google_search: {} };
    const liveModel = chatModel.bindTools([searchTool]);

    const result = await liveModel.invoke(input);

    const response = {
        response: result.content as string,
        tool_results: null
    };

    searchCache.set(cacheKey, response);
    logger.info("✅ Cached");
    return response;
}

export async function runAgent({ input, client_id, lat, long, live }: RunAgentParams) {
    const start = performance.now();

    // 1. INTENT CLASSIFICATION
    let intent = Intent.CHAT;

    if (live) {
        intent = Intent.LIVE_SEARCH;
    } else {
        // Use Semantic Classifier
        const { intent: clsIntent, score } = await intentClassifier.getIntent(input);
        logger.info(`Classifier output: ${clsIntent} (score: ${score.toFixed(2)})`);

        // Map specific categories to NEARBY
        const nearbyCategories = ['hospital', 'restaurant', 'school', 'petrol_pump', 'atm', 'garage', 'shop'];
        if (nearbyCategories.includes(clsIntent)) {
            intent = Intent.NEARBY;
        } else if (/(history|culture|population|mayor|when was|who is|tell me about sangamner|facts)/.test(input.toLowerCase())) {
            // Fallback for Knowledge (not in classifier map yet)
            intent = Intent.KNOWLEDGE;
        }
    }

    logger.info(`Final Intent: ${intent}`);

    // 2. ROUTING
    try {
        if (intent === Intent.LIVE_SEARCH) {
            return await runLiveSearch(input);
        }

        if (intent === Intent.NEARBY) {
            logger.info("Directly invoking Nearby Tool...");
            const tools = getTools({ client_id, lat, long });
            const nearbyTool = tools.find(t => t.name === "nearby_service_tool");

            if (nearbyTool) {
                const toolResultStr = await nearbyTool.call({ query: input });

                const formattingPrompt = `User asked: "${input}". 
                Here are the search results: ${toolResultStr}
                
                Please answer the user's question concisely using these results. Do not mention "ID" or internal data. Just list the places nicely.`;

                const response = await chatModel.invoke(formattingPrompt);
                let toolResults = null;
                try { toolResults = JSON.parse(toolResultStr); } catch { }

                return {
                    response: response.content as string,
                    tool_results: toolResults
                };
            }
        }

        if (intent === Intent.KNOWLEDGE) {
            logger.info("Directly invoking Knowledge Tool...");
            const tools = getTools({ client_id, lat, long });
            const knowledgeTool = tools.find(t => t.name === "sangamner_knowledge_tool");

            if (knowledgeTool) {
                const toolResultStr = await knowledgeTool.call({ query: input });

                const formattingPrompt = `User asked: "${input}".
                 Knowledge Base returned: ${toolResultStr}
                 
                 Synthesize an answer for the user based *only* on this information.`;

                const response = await chatModel.invoke(formattingPrompt);

                return {
                    response: response.content as string,
                    tool_results: toolResultStr
                };
            }
        }

        // Fallback or CHAT intent
        logger.info("Handling as General Chat...");
        const response = await chatModel.invoke(input);

        logger.info(`Total time: ${(performance.now() - start).toFixed(0)}ms`);
        return {
            response: response.content as string,
            tool_results: null
        };

    } catch (error: any) {
        logger.error(error, "Error during intent handling");
        return {
            response: "I encountered an error processing your request.",
            tool_results: { error: error.message }
        };
    }
}
