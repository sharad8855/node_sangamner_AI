import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './config/env';
import { loggerOptions } from './utils/logger';
import { chatRoutes } from './routes/chat';

export const buildApp = async (): Promise<FastifyInstance> => {
    const app = fastify({
        logger: {
            transport: loggerOptions.transport
        },
    });

    
    await app.register(cors, {
        origin: true, // Allow all origins (for development)
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true
    });

    await app.register(swagger, {
        openapi: {
            info: {
                title: 'Sangamner AI API',
                description: 'API Documentation for Sangamner AI project',
                version: '1.0.0'
            },
            servers: [
                { url: `http://localhost:${env.PORT}` }
            ]
        }
    });

    await app.register(swaggerUi, {
        routePrefix: '/docs',
        uiConfig: {
            docExpansion: 'list',
            deepLinking: false
        }
    });

    app.get('/health', {
        schema: {
            description: 'Check API health status',
            tags: ['System'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        timestamp: { type: 'string' }
                    }
                }
            }
        }
    }, async () => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // API Routes
    await app.register(chatRoutes, { prefix: '/api' });

    return app;
};