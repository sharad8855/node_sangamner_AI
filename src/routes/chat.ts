import { FastifyInstance } from 'fastify';
import { chatHandler } from '../controllers/chat';
import { chatSchema } from '../schemas/chat';
import { z } from 'zod';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';

export const chatRoutes = async (app: FastifyInstance) => {
    // Add type provider for Zod
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    app.withTypeProvider<ZodTypeProvider>().post('/chat', {
        schema: chatSchema
    }, chatHandler);
};
