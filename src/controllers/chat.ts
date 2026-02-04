import { FastifyReply, FastifyRequest } from 'fastify';
import { ChatRequest, ChatResponse } from '../schemas/chat';
import { logger } from '../utils/logger';
import { runAgent } from '../services/langchain';

export const chatHandler = async (
    request: FastifyRequest<{ Body: ChatRequest }>,
    reply: FastifyReply
) => {
    const { query, lat, long, client_id, user_id, history, live } = request.body;

    logger.info({ query, client_id, user_id }, 'Received chat request');
    const start = performance.now();

    try {
        const { response: aiText, tool_results } = await runAgent({
            input: query,
            client_id,
            lat,
            long
        });

        logger.info(`Total request time: ${(performance.now() - start).toFixed(0)}ms`);

        const response: ChatResponse = {
            ai_response: typeof aiText === 'string' ? aiText : JSON.stringify(aiText),
            result: tool_results || undefined
        };

        return reply.status(200).send(response);

    } catch (error) {
        logger.error(error, 'Error processing chat request');
        return reply.status(500).send({ error: 'Internal Server Error' });
    }
};
