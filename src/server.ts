import { buildApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

const start = async () => {
    try {
        const app = await buildApp();

        await app.listen({ port: env.PORT, host: '0.0.0.0' });
        logger.info(`Server is running at http://localhost:${env.PORT}`);
    } catch (err) {
        logger.error(err);
        process.exit(1);
    }
};

start();
