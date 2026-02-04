import { LoggerOptions } from 'pino';
import pino from 'pino';

export const loggerOptions: LoggerOptions = {
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
        },
    },
};

export const logger = pino(loggerOptions);
