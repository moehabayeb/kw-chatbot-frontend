// C:\xampp\htdocs\ClassWork\frontend\app.js
import ChatService from './chatService.js';

class ChatApp {
    constructor() {
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-button');
        this.chatMessages = document.getElementById('chat-messages');
        this.isLoading = false;
        
        this.currentSearchCriteria = {}; 
        this.fullSearchResults = []; 
        this.displayedResultsCount = 0; 
        this.resultsBatchSize = 3; // Let's show 3 at a time for better viewing

        this.conversationHistory = [];
        this.lastUserQueryForFeedback = "";
        this.lastBotResponseForFeedback = "";
        this.feedbackRequested = false;
    
        this.initialize();
    }

    initialize() {
        this.sendButton.addEventListener('click', () => this.handleUserMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleUserMessage();
            }
        });
        this.initiateChat();
    }

    async initiateChat() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showTypingIndicator();
        
        try {
            // Initiate with an empty criteria object and no history
            const serviceResponse = await ChatService.sendMessage("__INITIATE_CHAT__", {}, []);
            
            if (serviceResponse.bot_dialogue_message) {
                this.addMessage(serviceResponse.bot_dialogue_message, 'bot');
                this.conversationHistory.push({ bot: serviceResponse.bot_dialogue_message });
            }
        } catch (error) {
            console.error('Chat initiation error:', error);
            this.addMessage('Sorry, I encountered an error connecting. Please try refreshing the page.', 'bot');
        } finally {
            this.removeTypingIndicator();
            this.isLoading = false;
        }
    }

    async handleUserMessage() {
        const userMessage = this.messageInput.value.trim();
        if (!userMessage || this.isLoading) return;

        this.addMessage(userMessage, 'user');
        this.conversationHistory.push({ user: userMessage });
        const currentUserQueryForFeedback = userMessage;
        this.messageInput.value = '';
        
        if (this.handleSpecialCommands(userMessage, currentUserQueryForFeedback)) {
            return;
        }

        this.isLoading = true;
        this.showTypingIndicator();

        try {
            const serviceResponse = await ChatService.sendMessage(
                userMessage, 
                this.currentSearchCriteria,
                this.conversationHistory 
            );
            this.processServiceResponse(serviceResponse, currentUserQueryForFeedback);
        } catch (error) {
            console.error('Message handling error:', error);
            this.addMessage('Sorry, there was an issue processing your request. Please try again.', 'bot');
        } finally {
            this.removeTypingIndicator();
            this.isLoading = false;
        }
    }

    handleSpecialCommands(userMessage, currentUserQueryForFeedback) {
        const lowerMessage = userMessage.toLowerCase();
        
        if (lowerMessage.startsWith("feedback")) {
            const feedbackContent = userMessage.substring(8).trim();
            const ratings = {'1':'⭐ Poor','2':'⭐⭐ Fair','3':'⭐⭐⭐ Good','4':'⭐⭐⭐⭐ Very Good','5':'⭐⭐⭐⭐⭐ Excellent'};
            
            if (/^[1-5]$/.test(feedbackContent)) {
                this.sendFeedbackToServer(`Rating: ${ratings[feedbackContent]}`, this.lastUserQueryForFeedback, this.lastBotResponseForFeedback);
                this.addMessage("Thank you for your rating!", 'bot');
            } else if (feedbackContent) {
                this.sendFeedbackToServer(feedbackContent, this.lastUserQueryForFeedback, this.lastBotResponseForFeedback);
                this.addMessage("Thank you for your feedback!", 'bot');
            } else {
                this.addMessage("To leave feedback, type 'feedback 5' or 'feedback your comments'.", 'bot');
            }
            this.feedbackRequested = false;
            return true;
        }
        
        if (lowerMessage === "more" || lowerMessage === "show more") {
            if (this.fullSearchResults.length > 0 && this.displayedResultsCount < this.fullSearchResults.length) {
                this.displayMoreResults();
            } else if (this.fullSearchResults.length > 0) {
                this.addMessage("You've seen all available results for this search.", 'bot');
            } else {
                this.addMessage("I don't have any search results to show more of. Please start a new search.", 'bot');
            }
            return true;
        }
        
        return false;
    }

    processServiceResponse(serviceResponse, userQuery) {
        this.currentSearchCriteria = serviceResponse.current_search_criteria_for_frontend || this.currentSearchCriteria;
        
        if (serviceResponse.bot_dialogue_message) {
            this.addMessage(serviceResponse.bot_dialogue_message, 'bot');
            this.conversationHistory.push({ bot: serviceResponse.bot_dialogue_message });
            this.lastBotResponseForFeedback = serviceResponse.bot_dialogue_message;
        }

        if (serviceResponse.search_results && serviceResponse.search_results.length > 0) {
            this.fullSearchResults = serviceResponse.search_results;
            this.displayedResultsCount = 0;
            this.displayMoreResults();
        } else {
            this.fullSearchResults = [];
            this.displayedResultsCount = 0;
        }

        if (serviceResponse.ask_for_feedback) {
            this.promptForFeedback();
        }

        this.lastUserQueryForFeedback = userQuery;
    }

    displayMoreResults() {
        if (this.fullSearchResults.length === 0) return;

        const resultsToShow = this.fullSearchResults.slice(
            this.displayedResultsCount, 
            this.displayedResultsCount + this.resultsBatchSize
        );

        let formattedResults = "";
        resultsToShow.forEach(property => {
            // Using a more structured and robust HTML generation
            const highlight = property.llm_highlight ? `<div class="property-highlight">✨ ${property.llm_highlight}</div>` : '';
            const title = `<strong>🏠 ${property.title || 'Property'}</strong>`;
            const location = `📍 ${property.location || 'N/A'}`;
            const price = `💰 ${this.formatPrice(property.price)}`;
            const details = `🛏️ ${property.bedrooms ?? 'N/A'} beds | 🛁 ${property.bathrooms ?? 'N/A'} baths`;
            
            formattedResults += `<div class="property-card">${highlight}${title}<br>${location}<br>${price}<br>${details}</div>`;
        });

        if (this.displayedResultsCount > 0) {
            this.addMessage("Showing more properties:", 'bot');
        }
        
        this.addMessage(formattedResults, 'bot');
        this.displayedResultsCount += resultsToShow.length;

        if (this.displayedResultsCount < this.fullSearchResults.length) {
            this.addMessage("Type 'more' to see additional properties.", 'bot');
        }
    }

    formatPrice(price) {
        if (price === null || price === undefined) return 'Price on request';
        return `AED ${Number(price).toLocaleString()}`;
    }

    promptForFeedback() {
        if (this.feedbackRequested) return;

        const feedbackOptions = [
            "<div class='feedback-prompt'>",
            "How would you rate your experience with me today?",
            "<div class='feedback-options'>1️⃣ Poor | 2️⃣ Fair | 3️⃣ Good | 4️⃣ Very Good | 5️⃣ Excellent</div>",
            "Type 'feedback [number]' or 'feedback [comments]'",
            "</div>"
        ].join("");
        
        this.addMessage(feedbackOptions, 'bot');
        this.feedbackRequested = true;
    }

    async sendFeedbackToServer(feedbackText, userQueryContext, botResponseContext) {
        try {
            await ChatService.logFeedback({
                feedback: feedbackText,
                user_query_context: userQueryContext,
                bot_response_context: botResponseContext
            });
        } catch (error) {
            console.error('Error sending feedback:', error);
        }
    }

    showTypingIndicator() {
        if (document.querySelector('.typing')) return;
        const typingElement = document.createElement('div');
        typingElement.className = 'message bot typing';
        typingElement.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
        this.chatMessages.appendChild(typingElement);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    removeTypingIndicator() {
        const typingElement = document.querySelector('.typing');
        if (typingElement) {
            typingElement.remove();
        }
    }

    addMessage(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${sender}`;
        messageElement.innerHTML = message;
        this.chatMessages.appendChild(messageElement);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
}

document.addEventListener('DOMContentLoaded', () => new ChatApp());

// Make sure you have a chatService.js file