import { z } from 'zod';
import { FastifySchema } from 'fastify';

export const ChatRequestSchema = z.object({
    query: z.string().describe("The user's search query"),
    lat: z.number().default(0).describe("Latitude"),
    long: z.number().default(0).describe("Longitude"),
    client_id: z.string().describe("Client Identifier"),
    user_id: z.string().describe("User Identifier"),
    history: z.array(z.union([
        z.string(),  // For backward compatibility with string messages
        z.object({
            type: z.enum(['message', 'tool_result']),
            content: z.any()
        })
    ])).default([]).describe("Chat history with messages and tool results"),
    live: z.boolean().default(false).describe("Live mode")
});

export const ChatResponseSchema = z.object({
    ai_response: z.string().describe("AI's textual response"),
    result: z.any().optional().describe("Structured result if found"),
    actions: z.array(z.object({
        type: z.literal("button").describe("Action type"),
        title: z.string().describe("Button display text"),
        action: z.string().describe("Action identifier"),
        payload: z.object({
            business_id: z.string().optional().describe("Business ID if applicable"),
            user_id: z.string().describe("User ID"),
            client_id: z.string().describe("Client ID")
        })
    })).optional().describe("Contextual action buttons")
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
