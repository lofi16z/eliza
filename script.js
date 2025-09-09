// Lofi Stream Chat - Chill Vibes
class LofiStreamChat {
    constructor() {
        // Get DOM elements
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.chatSendBtn = document.getElementById('chat-send-btn');
        this.viewerCount = document.getElementById('viewer-count');
        
        // Audio elements g
        this.lofiAudio = document.getElementById('lofi-audio');
        this.volumeBtn = document.getElementById('volume-btn');
        this.volumeIcon = document.getElementById('volume-icon');
        this.volumeSlider = document.getElementById('volume-slider');
        this.volumeSliderContainer = document.getElementById('volume-slider-container');
        
        // Chat state
        this.isTyping = false;
        this.currentViewers = 1247;
        
        // WebSocket for shared chat
        this.ws = null;
        this.isConnected = false;
        this.isOwnMessage = false;
        
        // Session management
        this.sessionId = null;
        this.currentUsername = null;
        
        // Store separate chat history for each user (up to 10 messages)
        this.userChatHistories = new Map(); // username -> array of messages
        this.maxHistoryPerUser = 10;
        
        // Audio state
        this.serverStartTime = null;
        this.isAudioPlaying = false;
        this.audioDuration = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupAudio();
        this.setupCAClickToCopy();
        this.setupWebSocket();
    }
    
    setupEventListeners() {
        // Chat input handling
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleUserInput();
            }
        });
        
        // Send button
        this.chatSendBtn.addEventListener('click', () => {
            this.handleUserInput();
        });
        
        // Auto-focus input
        this.chatInput.focus();
    }
    
    setupAudio() {
        // Set initial volume to 0 (muted)
        this.lofiAudio.volume = 0;
        this.volumeSlider.value = 0;
        
        // Audio event listeners
        this.lofiAudio.addEventListener('loadedmetadata', () => {
            this.audioDuration = this.lofiAudio.duration;
            console.log('🎵 Audio loaded, duration:', this.audioDuration);
        });
        
        this.lofiAudio.addEventListener('canplaythrough', () => {
            console.log('🎵 Audio can play through');
            // Audio is ready, sync will happen when user clicks volume
        });
        
        // Volume button - toggles audio on/off
        this.volumeBtn.addEventListener('click', () => {
            this.handleVolumeClick();
        });
        
        // Right-click on volume button to show/hide slider for fine-tuning
        this.volumeBtn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.toggleVolumeSlider();
        });
        
        // Volume slider
        this.volumeSlider.addEventListener('input', (e) => {
            const volume = e.target.value / 100;
            this.lofiAudio.volume = volume;
            this.updateVolumeIcon(volume);
            
            // If volume is set to 0, pause audio
            if (volume === 0 && this.isAudioPlaying) {
                this.lofiAudio.pause();
                this.isAudioPlaying = false;
            }
            // If volume > 0 and audio was paused, resume it
            else if (volume > 0 && !this.isAudioPlaying && this.lofiAudio.currentTime > 0) {
                this.lofiAudio.play();
                this.isAudioPlaying = true;
            }
        });
        
        // Update volume icon initially (muted)
        this.updateVolumeIcon(0);
    }
    
    handleVolumeClick() {
        // Toggle audio on/off instead of showing slider
        if (!this.isAudioPlaying) {
            // Start audio with default volume
            this.volumeSlider.value = 30;
            this.lofiAudio.volume = 0.3;
            this.updateVolumeIcon(0.3);
            this.startAudioWithSync();
        } else {
            // Stop audio and mute
            this.lofiAudio.pause();
            this.lofiAudio.volume = 0;
            this.volumeSlider.value = 0;
            this.updateVolumeIcon(0);
            this.isAudioPlaying = false;
        }
    }
    
    startAudioWithSync() {
        // Sync to server time if available
        if (this.serverStartTime) {
            this.syncAudioToServerTime();
        }
        
        this.lofiAudio.play().then(() => {
            this.isAudioPlaying = true;
            console.log('🎵 Audio started playing');
        }).catch(e => {
            console.error('Audio play failed:', e);
            // Show user interaction required message
            this.showAudioPermissionMessage();
        });
    }
    
    toggleVolumeSlider() {
        const container = this.volumeSliderContainer;
        if (container.style.display === 'none') {
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
        }
    }
    
    updateVolumeIcon(volume) {
        if (volume === 0) {
            this.volumeIcon.textContent = '🔇';
        } else if (volume < 0.5) {
            this.volumeIcon.textContent = '🔉';
        } else {
            this.volumeIcon.textContent = '🔊';
        }
    }
    
    syncAudioToServerTime() {
        if (!this.serverStartTime || !this.audioDuration) {
            console.log('⚠️ Cannot sync audio - missing server time or duration');
            return;
        }
        
        // Calculate how much time has passed since server started
        const currentTime = Date.now();
        const elapsedTime = (currentTime - this.serverStartTime) / 1000; // Convert to seconds
        
        // Calculate position in the looped audio
        const audioPosition = elapsedTime % this.audioDuration;
        
        console.log(`🎵 Syncing audio: ${elapsedTime.toFixed(1)}s elapsed, setting position to ${audioPosition.toFixed(1)}s`);
        
        // Set the audio to the correct position
        this.lofiAudio.currentTime = audioPosition;
    }
    
    showAudioPermissionMessage() {
        // Create a temporary notification for audio permission
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--accent-orange);
            color: var(--bg-primary);
            padding: 1rem;
            border-radius: 8px;
            z-index: 1000;
            font-size: 0.9rem;
            max-width: 300px;
        `;
        notification.textContent = 'Click anywhere to enable audio playback';
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
        
        // Add one-time click listener to enable audio
        const enableAudio = () => {
            this.lofiAudio.play().then(() => {
                this.isAudioPlaying = true;
                if (this.serverStartTime) {
                    this.syncAudioToServerTime();
                }
                console.log('🎵 Audio enabled by user interaction');
            }).catch(console.error);
            document.removeEventListener('click', enableAudio);
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        };
        
        document.addEventListener('click', enableAudio);
    }
    
    setupCAClickToCopy() {
        const caAddress = document.getElementById('ca-address');
        if (caAddress) {
            caAddress.addEventListener('click', () => {
                const caText = 'AkAESfAsKYU5qJcuhc73mKxPJe7C2SAQj7zVCBRVpump';
                navigator.clipboard.writeText(caText).then(() => {
                    // Temporarily change text to show it was copied
                    const originalText = caAddress.textContent;
                    caAddress.textContent = 'COPIED!';
                    caAddress.style.color = 'var(--success-green)';
                    
                    setTimeout(() => {
                        caAddress.textContent = originalText;
                        caAddress.style.color = 'var(--accent-orange)';
                    }, 1500);
                }).catch(err => {
                    console.error('Failed to copy CA:', err);
                });
            });
        }
    }
    
    setupWebSocket() {
        const wsUrl = 'wss://<YOUR_URL_HERE';
        console.log('🔌 Connecting to WebSocket:', wsUrl);
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('✅ WebSocket connected');
            this.isConnected = true;
        };
        
        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleWebSocketMessage(message);
            } catch (error) {
                console.error('❌ Error parsing WebSocket message:', error);
            }
        };
        
        this.ws.onclose = () => {
            console.log('❌ WebSocket disconnected');
            this.isConnected = false;
            setTimeout(() => this.setupWebSocket(), 3000);
        };
        
        this.ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
        };
    }
    
    handleWebSocketMessage(message) {
        console.log('📨 Received WebSocket message:', message);
        
        switch (message.type) {
            case 'sync_history':
                this.syncSharedHistory(message.data);
                break;
            case 'user_message':
                this.handleSharedUserMessage(message.data);
                break;
            case 'ai_response':
                this.handleSharedAIResponse(message.data);
                break;
            case 'ai_typing':
                this.isTyping = true;
                this.showTypingIndicator();
                break;
            case 'viewer_count_update':
                this.updateViewerCount(message.data.count);
                break;
            case 'history_cleared':
                this.chatMessages.innerHTML = '';
                this.userChatHistories.clear();
                console.log('🧹 Chat history cleared');
                break;
        }
    }
    
    syncSharedHistory(data) {
        console.log('🔄 Syncing shared history');
        
        // Store session info if provided
        if (data.sessionId) {
            this.sessionId = data.sessionId;
        }
        if (data.username) {
            this.currentUsername = data.username;
            console.log('📝 Assigned username:', this.currentUsername);
        }
        
        // Store server start time for audio sync
        if (data.serverStartTime) {
            this.serverStartTime = data.serverStartTime;
            console.log('🎵 Server start time received:', new Date(this.serverStartTime).toLocaleTimeString());
            
            // Auto-sync audio if it's ready and playing
            if (this.audioDuration && this.isAudioPlaying) {
                this.syncAudioToServerTime();
            }
        }
        
        // Clear current chat
        this.chatMessages.innerHTML = '';
        
        // Add shared chat history
        data.chatHistory?.forEach(msg => {
            if (msg.type === 'user') {
                this.addChatMessage('user', msg.content, msg.username || 'viewer', false);
                // Add to user history
                this.addToUserHistory(msg.username || 'viewer', msg.content, 'user');
            } else if (msg.type === 'ai') {
                this.addChatMessage('ai', msg.content, 'Eliza', false);
            }
        });
        
        // Update viewer count if provided
        if (data.viewerCount) {
            this.updateViewerCount(data.viewerCount);
        }
    }
    
    handleSharedUserMessage(data) {
        console.log('👤 Received shared user message:', data);
        if (!this.isOwnMessage) {
            this.addChatMessage('user', data.content, data.username || 'viewer', false);
            // Add to user history
            this.addToUserHistory(data.username || 'viewer', data.content, 'user');
        }
        this.isOwnMessage = false;
    }
    
    handleSharedAIResponse(data) {
        console.log('🤖 Received shared AI response:', data);
        
        // Remove typing indicator and add AI response
        this.hideTypingIndicator();
        this.addChatMessage('ai', data.content, 'Eliza');
        
        // Add AI response to the user's history (if responding to specific user)
        if (data.respondingTo) {
            this.addToUserHistory(data.respondingTo, data.content, 'ai');
        }
        
        this.isTyping = false;
    }
    
    handleUserInput() {
        const input = this.chatInput.value.trim();
        if (!input || this.isTyping) return;
        
        console.log('📝 User input received:', input);
        
        // Clear input
        this.chatInput.value = '';
        
        // If WebSocket is connected, let server handle everything
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            // Send message via WebSocket - server will handle user message first, then AI response
            this.ws.send(JSON.stringify({
                type: 'chat_message',
                content: input
            }));
        } else {
            // Only add locally if WebSocket is not connected
            this.isOwnMessage = true;
            this.addChatMessage('user', input, this.currentUsername || 'viewer');
            this.addToUserHistory(this.currentUsername || 'viewer', input, 'user');
            this.generateAIResponse(input, this.currentUsername || 'viewer');
        }
    }
    
    async generateAIResponse(userInput, username) {
        if (this.isTyping) return;
        
        console.log('🎯 Generating AI response for:', userInput, 'from user:', username);
        this.isTyping = true;
        
        // Only used for fallback when WebSocket is not connected
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('🌐 Message already sent via WebSocket in handleUserInput');
            // Server will handle showing typing indicator after user message appears
        } else {
            // Show typing indicator for fallback mode
            this.showTypingIndicator();
            // Fallback to HTTP API if WebSocket not connected
            try {
                console.log('🌐 Calling HTTP API...');
                
                // Get user's chat history for context
                const userHistory = this.getUserHistory(username);
                
                const response = await this.callOpenAI(userInput, username, userHistory);
            console.log('📥 OpenAI response received:', response);
            
                // Server handles the response broadcasting via WebSocket
                if (!response) {
                    console.log('❌ No response received - server will handle fallback');
                }
        } catch (error) {
            console.error('🚨 OpenAI API error:', error);
                // Server handles fallback response
            console.log('🔄 Server will handle fallback response');
            }
        }
    }
    
    async callOpenAI(userInput, username, userHistory) {
        try {
            console.log('🔗 Making API request to /api/chat');
            
            const response = await fetch('https://YOU_URL_HRERE/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({
                    message: userInput,
                    username: username,
                    userHistory: userHistory
                })
            });

            console.log('📡 API response status:', response.status);

            if (!response.ok) {
                throw new Error(`API responded with status ${response.status}`);
            }

            const aiResponse = await response.json();
            console.log('✨ Parsed AI response:', aiResponse);
            return aiResponse;
        } catch (error) {
            console.error('🚨 Chat API call failed:', error);
            return null;
        }
    }
    
    addChatMessage(type, content, username = 'viewer', autoScroll = true) {
        const message = document.createElement('div');
        message.className = 'chat-message';
        
        const timestamp = new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const messageHeader = document.createElement('div');
        messageHeader.className = 'message-header';
        
        const usernameSpan = document.createElement('span');
        usernameSpan.className = `username ${type}`;
        usernameSpan.textContent = username;
        
        const timestampSpan = document.createElement('span');
        timestampSpan.className = 'timestamp';
        timestampSpan.textContent = timestamp;
        
        messageHeader.appendChild(usernameSpan);
        
        // Add badges for special users
        if (type === 'ai') {
            const badge = document.createElement('span');
            badge.className = 'badge ai';
            badge.textContent = 'AI';
            messageHeader.appendChild(badge);
        }
        
        messageHeader.appendChild(timestampSpan);
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.textContent = content;
        
        message.appendChild(messageHeader);
        message.appendChild(messageContent);
        
        this.chatMessages.appendChild(message);
        
        if (autoScroll) {
            this.scrollToBottom();
        }
    }
    
    showTypingIndicator() {
        // Remove existing typing indicator if any
        this.hideTypingIndicator();
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typing-indicator';
        
        typingDiv.innerHTML = `
            <div class="typing-user">Eliza is typing</div>
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        
        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }
    
    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    // Mood system removed - replaced with audio controls
    
    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    updateViewerCount(count) {
        this.currentViewers = count;
        if (this.viewerCount) {
            this.viewerCount.textContent = count.toLocaleString();
        }
    }
    
    addToUserHistory(username, message, type) {
        if (!this.userChatHistories.has(username)) {
            this.userChatHistories.set(username, []);
        }
        
        const userHistory = this.userChatHistories.get(username);
        userHistory.push({ message, type, timestamp: Date.now() });
        
        // Keep only the last 10 messages for this user
        if (userHistory.length > this.maxHistoryPerUser) {
            userHistory.shift();
        }
    }
    
    getUserHistory(username) {
        return this.userChatHistories.get(username) || [];
    }
    
    addWelcomeMessage() {
        // No automatic welcome message
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.lofiStreamChat = new LofiStreamChat();
});

// Auto-focus chat input when typing anywhere
document.addEventListener('keydown', (e) => {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        if (e.key.length === 1 || e.key === 'Backspace') {
            const chatInput = document.getElementById('chat-input');
            if (chatInput) {
                chatInput.focus();
            }
        }
    }
});

// Click anywhere in chat area to focus input
document.addEventListener('click', (e) => {
    if (e.target.closest('.stream-chat-section')) {
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.focus();
        }
    }
});
