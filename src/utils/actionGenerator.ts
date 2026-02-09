interface ActionButton {
    type: "button";
    title: string;
    action: string;
    payload: {
        business_id?: string;
        user_id: string;
        client_id: string;
    };
}

interface GenerateActionsParams {
    business_id?: string;
    user_id: string;
    client_id: string;
}

/**
 * Generate contextual action buttons for a specific business
 * @param params - Contains business_id, user_id, and client_id
 * @returns Array of action buttons
 */
export function generateActions(params: GenerateActionsParams): ActionButton[] {
    const { business_id, user_id, client_id } = params;

    // If no business_id, return empty actions
    if (!business_id) {
        return [];
    }

    const payload = {
        business_id,
        user_id,
        client_id
    };

    return [
        {
            type: "button",
            title: "Book appointment",
            action: "book_appointment",
            payload
        },
        {
            type: "button",
            title: "Show Services",
            action: "show_services",
            payload
        },
        {
            type: "button",
            title: "Active Offers",
            action: "active_offers",
            payload
        },
        {
            type: "button",
            title: "Get Directions",
            action: "get_directions",
            payload
        },
        {
            type: "button",
            title: "View Details",
            action: "view_details",
            payload
        }
    ];
}

/**
 * Detect if user is selecting a specific business from previous results
 * @param query - User's message
 * @param results - Previous tool results array
 * @returns Business ID if selection detected, undefined otherwise
 */
export function detectBusinessSelection(query: string, results?: any[]): string | undefined {
    if (!results || results.length === 0) {
        return undefined;
    }

    const lowerQuery = query.toLowerCase();

    // Check for positional selections
    if (/(first|1st|one)/i.test(lowerQuery)) {
        return results[0]?.id;
    }
    if (/(second|2nd|two)/i.test(lowerQuery)) {
        return results[1]?.id;
    }
    if (/(third|3rd|three)/i.test(lowerQuery)) {
        return results[2]?.id;
    }

    // Check for business name match
    for (const business of results) {
        if (business.name && lowerQuery.includes(business.name.toLowerCase())) {
            return business.id;
        }
    }

    // Check for "best" references - find highest rated business
    if (/(best|top|highest rated)/i.test(lowerQuery)) {
        const bestBusiness = results.reduce((best, current) => {
            return (current.rating || 0) > (best.rating || 0) ? current : best;
        }, results[0]);
        return bestBusiness?.id;
    }

    // Check for generic confirmation (yes/ok/proceed/go ahead)
    // STRICT: Only if there's meaningful context (not just "ok" or "yes" alone)
    if (/(proceed|go ahead|go with|choose|select|book)/i.test(lowerQuery)) {
        // If query mentions "that" or "this" or "it", try to infer from context
        if (/(that|this|it)/i.test(lowerQuery)) {
            // Try to find the best one (most likely what user is referring to)
            const bestBusiness = results.reduce((best, current) => {
                return (current.rating || 0) > (best.rating || 0) ? current : best;
            }, results[0]);
            return bestBusiness?.id;
        }
        // If query has business name or position mentioned
        if (lowerQuery.length > 15) {  // More than just "proceed"
            return results[0]?.id;
        }
    }

    return undefined;
}
