const { QdrantClient } = require('@qdrant/js-client-rest');
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const qdrantClient = new QdrantClient({
    url: env.QDRANT_URL,
    apiKey: env.QDRANT_API_KEY,
});

export const initQdrant = async () => {
    try {
        const collections = await qdrantClient.getCollections();
        logger.info(`Connected to Qdrant. Collections: ${collections.collections.map((c: any) => c.name).join(', ')}`);
    } catch (error) {
        logger.error(error, 'Failed to connect to Qdrant');
        throw error;
    }
};
