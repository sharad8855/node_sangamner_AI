export * from './nearby';
import { createNearbyTool } from './nearby';

import { createKnowledgeTool } from './knowledge';

// We export a function to get tools since many depend on request context
export const getTools = (context: { client_id: string; lat?: number; long?: number }) => {
    return [
        createNearbyTool(context),
        createKnowledgeTool({ client_id: context.client_id })
    ];
};
