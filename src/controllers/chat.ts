import { FastifyReply, FastifyRequest } from 'fastify';
import { ChatRequest, ChatResponse } from '../schemas/chat';
import { logger } from '../utils/logger';
import { runAgent } from '../services/langchain';

function extractLastToolResult(history: any[]): any[] | undefined {
    for (let i = history.length - 1; i >= 0; i--) {
        const item = history[i];
        if (typeof item === 'object' && item.type === 'tool_result') {
            return item.content;
        }
    }
    return undefined;
}

export const chatHandler = async (
    request: FastifyRequest<{ Body: ChatRequest }>,
    reply: FastifyReply
) => {
    const { query, lat, long, client_id, user_id, history, live } = request.body;
    const previous_results = extractLastToolResult(history);

    logger.info({ query, client_id, user_id }, 'Received chat request');
    const start = performance.now();

    try {
        // ✅ Navin keys (ai_response, result, actions) pramane destructure kara
        const { ai_response, result, actions } = await runAgent({
            input: query,
            client_id,
            user_id,
            lat,
            long,
            live,
            previous_results,
            history
        });

        logger.info(`Total request time: ${(performance.now() - start).toFixed(0)}ms`);

        // ✅ Direct response object vapra jo ChatResponse schema shi match hoto
        const response: ChatResponse = {
            ai_response,
            result: result || undefined,
            actions: actions || []
        };

        return reply.status(200).send(response);

    } catch (error) {
        logger.error(error, 'Error processing chat request');
        return reply.status(500).send({ error: 'Internal Server Error' });
    }
};