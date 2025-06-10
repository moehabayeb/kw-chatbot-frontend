import CONFIG from './config.js';

class ChatService {
    // UPDATED: Now accepts 'conversationHistory' as an argument
    static async sendMessage(userMessage, currentCriteria, conversationHistory = []) {
        console.groupCollapsed(`ChatService: Sending message to ${CONFIG.API_ENDPOINT}`);
        console.debug('User Message:', userMessage);
        console.debug('Current Criteria:', currentCriteria);
        console.debug('Conversation History:', conversationHistory);
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for live server
            
            const response = await fetch(CONFIG.API_ENDPOINT, {
                method: 'POST',
                headers: CONFIG.HEADERS,
                body: JSON.stringify({ 
                    query: userMessage, 
                    criteria_so_far: currentCriteria,
                    conversation_history: conversationHistory // ADDED: Send history to backend
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorDetails = await this.parseErrorResponse(response);
                console.error('Server Error:', errorDetails);
                throw new Error(errorDetails.message || `Server responded with status ${response.status}`);
            }

            const data = await response.json();
            console.debug('Server Response:', data);
            console.groupEnd();

            // Make sure to handle all expected keys from the backend
            return {
                bot_dialogue_message: data.bot_dialogue_message || "I'm not sure how to respond to that.",
                search_results: data.search_results || [],
                current_search_criteria_for_frontend: data.current_search_criteria_for_frontend || {},
                search_performed_with_criteria: data.search_performed_with_criteria || false,
                ask_for_feedback: data.ask_for_feedback || false, // ADDED: Handle feedback flag
                rawData: data
            };

        } catch (error) {
            console.groupEnd();
            console.error('ChatService Error:', error);
            return this.handleErrorMessage(error, currentCriteria);
        }
    }

    static async logFeedback(feedbackData) {
        // A dedicated function for sending feedback, using a different endpoint
        const feedbackEndpoint = CONFIG.API_ENDPOINT.replace('/search', '/log_feedback');
        try {
            await fetch(feedbackEndpoint, {
                method: 'POST',
                headers: CONFIG.HEADERS,
                body: JSON.stringify(feedbackData)
            });
            console.log("Feedback logged successfully.");
        } catch(error) {
            console.error("Failed to log feedback:", error);
        }
    }

    static async parseErrorResponse(response) {
        try {
            const errorData = await response.json();
            return {
                status: response.status,
                message: errorData.error || errorData.message || 'Unknown server error',
                details: errorData.details || null
            };
        } catch (e) {
            return {
                status: response.status,
                message: `HTTP Error ${response.status}. The server may be busy or starting up.`,
                details: null
            };
        }
    }

    static handleErrorMessage(error, currentCriteria) {
        let userMessage = "Sorry, I encountered an error processing your request.";
        
        if (error.name === 'AbortError') {
            userMessage = "The request took too long. The server might be starting up. Please try again in a moment.";
        } else if (error.message.includes('Failed to fetch')) {
            userMessage = "I can't connect to the server. Please check your internet connection.";
        } else {
            // Keep the error message brief for the user
            userMessage = error.message;
        }

        return {
            bot_dialogue_message: `Sorry, an error occurred: ${userMessage}`,
            search_results: [],
            current_search_criteria_for_frontend: currentCriteria,
            search_performed_with_criteria: false,
            ask_for_feedback: false,
            error: true
        };
    }
}

export default ChatService;