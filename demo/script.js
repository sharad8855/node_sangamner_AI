// API Configuration
const API_CONFIG = {
    baseUrl: 'http://localhost:3002',  // Updated to match your .env PORT
    endpoint: '/api/chat',
    userContext: {
        user_id: "9a1b2c3d-4e5f-4a91-8911-2c3d4e5000222",
        client_id: "9a1b2c3d-4e5f-4a91-8911-2c3d4e500001",
        lat: 19.571749,
        long: 74.223877
    }
};

// DOM Elements
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

// Conversation history
let conversationHistory = [];
let lastToolResults = null;

// Helper function to add to history with FIFO limit (max 10 items)
function addToHistory(item) {
    conversationHistory.push(item);

    // Keep only last 10 items (FIFO - First In, First Out)
    while (conversationHistory.length > 10) {
        conversationHistory.shift(); // Remove first (oldest) item
    }
}

// Initialize chat
function init() {
    // Add welcome message
    addBotMessage("Hello! Welcome to Sangamner AI. How can I help you today?");

    // Event listeners
    sendBtn.addEventListener('click', handleSendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    });
}

// Handle send message
async function handleSendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    // Add user message
    addUserMessage(message);
    messageInput.value = '';

    // Add to conversation history with FIFO limit
    addToHistory(message);

    // Show typing indicator
    const typingEl = createTypingIndicator();
    messagesContainer.appendChild(typingEl);
    scrollToBottom();

    try {
        // Call the API
        const response = await callChatAPI(message);

        // Remove typing indicator
        typingEl.remove();

        // Add bot response
        addBotMessage(
            response.ai_response,
            response.actions || [],
            response.result
        );

        // Store AI response in history (for conversation context)
        addToHistory(response.ai_response);

        // Store tool results for next request
        lastToolResults = response.result;

        // Add tool results to history for context (with FIFO limit)
        if (response.result && Array.isArray(response.result)) {
            addToHistory({
                type: 'tool_result',
                content: response.result
            });
        }

    } catch (error) {
        // Remove typing indicator
        typingEl.remove();

        console.error('API Error:', error);
        addBotMessage(`Sorry, I encountered an error: ${error.message}`);
    }
}

// Call the chat API
async function callChatAPI(query) {
    const payload = {
        query: query,
        lat: API_CONFIG.userContext.lat,
        long: API_CONFIG.userContext.long,
        client_id: API_CONFIG.userContext.client_id,
        user_id: API_CONFIG.userContext.user_id,
        history: conversationHistory,
        live: false
    };

    console.log('Sending request:', payload);

    const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Received response:', data);

    return data;
}

// Add user message to chat
function addUserMessage(text) {
    const messageEl = createMessageElement('user', text);
    messagesContainer.appendChild(messageEl);
    scrollToBottom();
}

// Add bot message to chat
function addBotMessage(text, actions = [], businesses = null) {
    // Add bot message
    const messageEl = createMessageElement('bot', text);

    // Add business results if provided
    if (businesses && Array.isArray(businesses) && businesses.length > 0) {
        const resultsEl = createBusinessResults(businesses);
        messageEl.querySelector('.message-content').appendChild(resultsEl);
    }

    // Add action buttons if provided
    if (actions && actions.length > 0) {
        const actionsEl = createActionButtons(actions);
        messageEl.querySelector('.message-content').appendChild(actionsEl);
    }

    messagesContainer.appendChild(messageEl);
    scrollToBottom();
}

// Create message element
function createMessageElement(type, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = type === 'user' ? 'U' : 'AI';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = text;

    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });

    contentDiv.appendChild(bubble);
    contentDiv.appendChild(time);

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);

    return messageDiv;
}

// Create business results display
function createBusinessResults(businesses) {
    const resultsDiv = document.createElement('div');
    resultsDiv.className = 'business-results';

    businesses.forEach((business, index) => {
        const card = document.createElement('div');
        card.className = 'business-card';

        const name = business.name || business.business_name || 'Unknown Business';
        const address = business.address || `${business.city || ''}, ${business.pincode || ''}`;
        const phone = business.phone || business.phone_number || 'N/A';
        const distance = business.distance_km || business.distance || 0;
        const rating = business.rating || 0;

        card.innerHTML = `
            <div class="business-name">${index + 1}. ${name}</div>
            <div class="business-info">
                <div>📍 ${address}</div>
                <div>📞 ${phone}</div>
                <div class="business-distance">⭐ ${rating.toFixed(1)} • ${distance.toFixed(1)} km away</div>
            </div>
        `;

        card.addEventListener('click', () => {
            handleBusinessSelection(business, index + 1);
        });

        resultsDiv.appendChild(card);
    });

    return resultsDiv;
}

// Create action buttons
function createActionButtons(actions) {
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'action-buttons';

    actions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = 'action-btn';
        btn.textContent = action.title;

        btn.addEventListener('click', () => {
            handleActionClick(action);
        });

        actionsDiv.appendChild(btn);
    });

    return actionsDiv;
}

// Create typing indicator
function createTypingIndicator() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot';

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = 'AI';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;

    contentDiv.appendChild(typingDiv);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);

    return messageDiv;
}

// Handle business selection (from clicking a card)
async function handleBusinessSelection(business, position) {
    const businessId = business.id || business.business_id;
    const businessName = business.name || business.business_name;

    // Send message indicating selection
    const selectionMessage = `I'll go with the ${getPositionText(position)} one - ${businessName}`;
    messageInput.value = selectionMessage;
    await handleSendMessage();
}

// Handle action button click
function handleActionClick(action) {
    console.log('Action clicked:', action);
    console.log('Payload:', JSON.stringify(action.payload, null, 2));

    // Add user message
    addUserMessage(`Clicked: ${action.title}`);

    // Show confirmation
    setTimeout(() => {
        addBotMessage(
            `✅ Action "${action.title}" triggered!\n\n` +
            `Payload sent:\n` +
            `• Business ID: ${action.payload.business_id}\n` +
            `• User ID: ${action.payload.user_id}\n` +
            `• Client ID: ${action.payload.client_id}\n\n` +
            `This would be sent to your backend for processing.`
        );
    }, 500);
}

// Helper functions
function getPositionText(position) {
    const positions = ['', 'first', 'second', 'third'];
    return positions[position] || 'selected';
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Initialize on load
init();
