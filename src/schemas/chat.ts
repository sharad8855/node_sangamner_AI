import { z } from 'zod';
import { FastifySchema } from 'fastify';

export const ChatRequestSchema = z.object({
    query: z.string().describe("The user's search query"),
    lat: z.number().default(0).describe("Latitude"),
    long: z.number().default(0).describe("Longitude"),
    client_id: z.string().describe("Client Identifier"),
    user_id: z.string().describe("User Identifier"),
    history: z.array(z.string()).default([]).describe("Chat history"),
    live: z.boolean().default(false).describe("Live mode")
});

export const ChatResponseSchema = z.object({
    ai_response: z.string().describe("AI's textual response"),
    result: z.any().optional().describe("Structured result if found")
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export const chatSchema: FastifySchema = {
    description: 'Chat with Sangamner AI',
    tags: ['Chat'],
    body: ChatRequestSchema,
    response: {
        200: ChatResponseSchema
    }
};
