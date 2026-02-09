import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { getTools } from "../tools";
import { logger } from "../utils/logger";
import { generateActions, detectBusinessSelection } from "../utils/actionGenerator";

const chatModel = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    temperature: 0,
    maxRetries: 1,
    apiKey: process.env.GEMINI_API_KEY,
});

function buildMessageHistory(history: any[]): (HumanMessage | AIMessage)[] {
    const messages: (HumanMessage | AIMessage)[] = [];
    if (!history) return messages;
    for (let i = 0; i < history.length; i++) {
        const item = history[i];
        if (typeof item === 'string') {
            messages.push(new HumanMessage(item));
            if (i + 1 < history.length && typeof history[i + 1] === 'string') {
                messages.push(new AIMessage(history[i + 1]));
                i++;
            }
        }
    }
    return messages;
}

interface RunAgentParams {
    input: string;
    client_id: string;
    user_id: string;
    lat?: number;
    long?: number;
    live?: boolean;
    previous_results?: any[];
    history?: any[];
}

export async function runAgent({ input, client_id, user_id, lat, long, live, previous_results, history }: RunAgentParams) {
    const start = performance.now();
    
    // 1. Context madhun business selection check karne
    const selectedBusinessId = detectBusinessSelection(input, previous_results);

    try {
        const tools = getTools({ client_id, lat, long });
        const modelWithTools = chatModel.bindTools(tools);

        // ✅ Updated System Prompt with get_business_actions logic
        const systemPromptStr = `You are Sangamner AI, a friendly local assistant.
User location: ${lat}, ${long}
Client: ${client_id}

1. Reply ONLY in user's last language (English OR Marathi). Never mix.

TOOLS:
- nearby_service_tool: Search for places (gyms, hospitals, schools).
- sangamner_knowledge_tool: Local facts about Sangamner (MLA, history, fees).
- live_search_tool: General internet queries (only if live mode is on).

BEHAVIOR:
1. If the user says "yes", "proceed", "book", or "I choose [Name]", you MUST identify the business ID.
2. When a specific business is selected or confirmed, mention that "Action buttons" (like Book Appointment, Get Directions) are available below.
3. For "which is best", compare 'rating' in the data. Mention the rating.
4. Short. Friendly. Human. Professional.`;

        const messageHistory = buildMessageHistory(history || []);
        const messages = [
            new SystemMessage(systemPromptStr),
            ...messageHistory,
            new HumanMessage(input)
        ];

        const response = await modelWithTools.invoke(messages);
        let finalAiText = response.content as string;
        let tool_results = null;

        // 2. Tool Calling Logic
        if (response.tool_calls && response.tool_calls.length > 0) {
            const toolCall = response.tool_calls[0];
            const selectedTool = tools.find(t => t.name === toolCall.name);

            if (selectedTool) {
                logger.info(`Gemini calling: ${toolCall.name}`);
                const toolOutput = await selectedTool.call(toolCall.args as any);
                const toolOutputString = typeof toolOutput === 'string' ? toolOutput : JSON.stringify(toolOutput);

                try {
                    tool_results = JSON.parse(toolOutputString);
                } catch {
                    tool_results = toolOutputString;
                }

                const finalResponse = await chatModel.invoke([
                    ...messages,
                    new AIMessage(response),
                    new HumanMessage(`DATA FROM TOOL: ${toolOutputString}\n\nBased on this, give a short final response. If it's a place, mention I've found some results for you.`)
                ]);
                finalAiText = finalResponse.content as string;
            }
        }

        // ✅ 3. Get Business Actions (The missing piece)
        // Jar user ne konta business select kela asel tar buttons generate kara
        let actions: any[] = [];
        
        // Keywords check kara: proceed, book, select, kiva yes
        const userWantsToProceed = /(proceed|yes|book|choose|select|go with|take me there)/i.test(input);

        const finalBusinessId = selectedBusinessId || (tool_results && Array.isArray(tool_results) && userWantsToProceed ? tool_results[0].id : undefined);

        // STRICTION: Buttons fakt user ne confirmation dilya nantarch dakhva
        if (finalBusinessId && userWantsToProceed) {
            logger.info(`Generating actions for business_id: ${finalBusinessId}`);
            actions = generateActions({ 
                business_id: finalBusinessId, 
                user_id, 
                client_id 
            });
            
            if (!finalAiText.toLowerCase().includes("buttons") && !finalAiText.toLowerCase().includes("below")) {
                finalAiText += " You can use the buttons below to proceed.";
            }
        }

        return {
            ai_response: finalAiText,
            result: tool_results,
            actions: actions
        };

    } catch (error: any) {
        logger.error(error, "Agent Error");
        return { 
            ai_response: "Mala maf kara, kahi tri तांत्रिक adchan aali ahe.", 
            result: null, 
            actions: [] 
        };
    }
}