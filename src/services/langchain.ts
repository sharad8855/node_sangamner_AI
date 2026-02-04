import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent } from "langchain";
import { getTools } from "../tools";
import { logger } from "../utils/logger";

const chatModel = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    temperature: 0,
    maxRetries: 1,
    apiKey: process.env.GEMINI_API_KEY,
});

interface RunAgentParams {
    input: string;
    client_id: string;
    lat?: number;
    long?: number;
}

export async function runAgent({ input, client_id, lat, long }: RunAgentParams) {
    const start = performance.now();
    const tools = getTools({ client_id, lat, long });

    // ✅ Pass model INSTANCE (ChatGoogleGenerativeAI), not string name
    const agent = createAgent({
        model: chatModel,  // Full LLM object ✅
        tools: tools,
        systemPrompt: "You are a helpful AI assistant for Sangamner. You have access to 'nearby_service_tool' for finding places and 'sangamner_knowledge_tool' for general info. Use the appropriate tool AT MOST ONCE. Provide a concise answer listing the top 3 results only.",
    });

    const result = await agent.invoke({
        messages: [{ role: "user", content: input }],
    }, {
        recursionLimit: 5
    });

    const messages = result.messages;
    const lastMessage = messages[messages.length - 1];
    let toolResults = null;

    // Find the output of the nearby_service_tool if it was called
    for (const msg of messages) {
        if (msg._getType() === "tool" && msg.name === "nearby_service_tool") {
            try {
                // The tool returns a JSON string, parse it back to object
                toolResults = JSON.parse(msg.content as string);
            } catch (e) {
                toolResults = msg.content;
            }
        }
    }

    logger.info(`Agent execution took ${(performance.now() - start).toFixed(0)}ms`);

    return {
        response: lastMessage.content,
        tool_results: toolResults
    };
}