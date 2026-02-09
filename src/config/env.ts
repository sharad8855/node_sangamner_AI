import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
    PORT: z.string().default('3000').transform((val) => parseInt(val, 10)),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    GOOGLE_API_KEY: z.string().optional(),
    NEARBY_SERVICE_URL: z.string().url().default('https://sangamner-ai-agent.157-20-215-17.nip.io/api/find-nearby/'),
    KNOWLEDGE_SERVICE_URL: z.string().url().default('https://digital-parbhani-ai.157-20-215-17.nip.io/api/v1/chat'),
});

export const env = envSchema.parse(process.env);
