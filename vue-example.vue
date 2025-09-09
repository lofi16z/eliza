<template>
  <!-- AI Streamer Chat - Vue Example -->
  <div class="ai-streamer-container">
    <!-- Header -->
    <header class="header">
      <h1 class="logo">lofi16z</h1>
      <div class="header-info">
        <div class="ca-address">
          <span>CA: AkAESfAsKYU5qJcuhc73mKxPJe7C2SAQj7zVCBRVpump</span>
        </div>
        <div class="social-links">
          <a href="https://twitter.com" class="social-link">twitter</a>
          <a href="https://github.com" class="social-link">github</a>
        </div>
        <div class="status-badge">
          <span class="status-dot"></span>
          <span>online</span>
        </div>
      </div>
    </header>

    <!-- Content Area -->
    <div class="content-area">
      <!-- Chat Section -->
      <div class="chat-section">
        <div class="chat-window">
          <div class="chat-header">
            <div class="chat-title">
              <span>💬</span>
              <span>Stream Chat</span>
            </div>
            <div class="chat-status">
              <span class="live-dot"></span>
              <span class="live-text">LIVE</span>
              <span class="viewer-count">{{ viewerCount }}</span>
            </div>
          </div>
          
          <div class="chat-body">
            <div class="chat-messages" ref="chatMessages">
              <div 
                v-for="message in messages" 
                :key="message.id" 
                class="chat-message"
              >
                <div class="message-header">
                  <span 
                    class="username" 
                    :class="{ ai: message.type === 'ai' }"
                  >
                    {{ message.username }}
                  </span>
                  <span v-if="message.type === 'ai'" class="ai-badge">AI</span>
                  <span class="timestamp">
                    {{ formatTime(message.timestamp) }}
                  </span>
                </div>
                <div class="message-content">
                  {{ message.content }}
                </div>
              </div>
              
              <div v-if="isTyping" class="typing-indicator">
                <div class="typing-user">Eliza is typing</div>
                <div class="typing-dots">
                  <span class="typing-dot"></span>
                  <span class="typing-dot" style="animation-delay: 0.2s"></span>
                  <span class="typing-dot" style="animation-delay: 0.4s"></span>
                </div>
              </div>
            </div>
            
            <div class="chat-input-container">
              <input
                v-model="inputValue"
                @keypress.enter="sendMessage"
                type="text"
                placeholder="Say something..."
                class="chat-input"
              />
              <button @click="sendMessage" class="send-button">
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Visual Section -->
      <div class="visual-section">
        <div class="gif-container">
          <img src="lofi.gif" alt="Lofi vibes" class="lofi-gif" />
        </div>
        
        <div class="audio-controls">
          <div class="audio-info">
            <span class="now-playing">🎵 Night and Jazz</span>
            <button @click="toggleAudio" class="volume-btn">
              <span>{{ isAudioPlaying ? '🔉' : '🔇' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Hidden Audio Element -->
    <audio ref="lofiAudio" loop preload="auto">
      <source src="Night and Jazz.mp3" type="audio/mpeg" />
    </audio>
  </div>
</template>

<script>
export default {
  name: 'AIStreamerChat',
  data() {
    return {
      // Chat state
      messages: [],
      inputValue: '',
      isTyping: false,
      currentUsername: null,
      viewerCount: 0,
      
      // Audio state
      isAudioPlaying: false,
      serverStartTime: null,
      audioDuration: null,
      
      // WebSocket
      ws: null,
      isConnected: false,
      sessionId: null,
      
      // User history tracking
      userHistories: new Map(),
    };
  },
  
  mounted() {
    this.initializeChat();
    this.setupAudio();
  },
  
  beforeUnmount() {
    if (this.ws) {
      this.ws.close();
    }
  },
  
  methods: {
    // Initialize chat system
    initializeChat() {
      this.connectWebSocket();
    },
    
    // WebSocket connection
    connectWebSocket() {
      this.ws = new WebSocket('wss://be5ad9cb5146.ngrok-free.app/');
      
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
        setTimeout(() => this.connectWebSocket(), 3000);
      };
      
      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };
    },
    
    // Handle WebSocket messages
    handleWebSocketMessage(message) {
      switch (message.type) {
        case 'sync_history':
          // Set session info
          if (message.data.sessionId) {
            this.sessionId = message.data.sessionId;
          }
          if (message.data.username) {
            this.currentUsername = message.data.username;
          }
          if (message.data.serverStartTime) {
            this.serverStartTime = message.data.serverStartTime;
          }
          
          // Sync chat history
          const chatHistory = message.data.chatHistory || [];
          this.messages = chatHistory.map(msg => ({
            id: msg.id,
            type: msg.type,
            content: msg.content,
            username: msg.username || 'user',
            timestamp: msg.timestamp
          }));
          break;
          
        case 'user_message':
          this.messages.push({
            id: message.data.id,
            type: 'user',
            content: message.data.content,
            username: message.data.username,
            timestamp: message.data.timestamp
          });
          this.scrollToBottom();
          break;
          
        case 'ai_typing':
          this.isTyping = true;
          this.scrollToBottom();
          break;
          
        case 'ai_response':
          this.isTyping = false;
          this.messages.push({
            id: message.data.id,
            type: 'ai',
            content: message.data.content,
            username: 'Eliza',
            timestamp: message.data.timestamp
          });
          this.scrollToBottom();
          break;
          
        case 'viewer_count_update':
          this.viewerCount = message.data.count;
          break;
          
        case 'history_cleared':
          this.messages = [];
          this.userHistories.clear();
          break;
      }
    },
    
    // Chat functionality
    sendMessage() {
      if (!this.inputValue.trim() || this.isTyping || !this.ws) return;
      
      // Send via WebSocket
      this.ws.send(JSON.stringify({
        type: 'chat_message',
        content: this.inputValue.trim()
      }));
      
      this.inputValue = '';
    },
    
    // Audio functionality
    setupAudio() {
      if (this.$refs.lofiAudio) {
        this.$refs.lofiAudio.addEventListener('loadedmetadata', () => {
          this.audioDuration = this.$refs.lofiAudio.duration;
          console.log('🎵 Audio loaded, duration:', this.audioDuration);
        });
        
        // Set initial volume to 0
        this.$refs.lofiAudio.volume = 0;
      }
    },
    
    toggleAudio() {
      if (!this.$refs.lofiAudio) return;
      
      if (!this.isAudioPlaying) {
        // Start audio
        if (this.serverStartTime) {
          this.syncAudioToServerTime();
        }
        this.$refs.lofiAudio.play().then(() => {
          this.isAudioPlaying = true;
          this.$refs.lofiAudio.volume = 0.3;
        }).catch(console.error);
      } else {
        // Stop audio
        this.$refs.lofiAudio.pause();
        this.$refs.lofiAudio.volume = 0;
        this.isAudioPlaying = false;
      }
    },
    
    syncAudioToServerTime() {
      if (!this.serverStartTime || !this.audioDuration || !this.$refs.lofiAudio) {
        return;
      }
      
      const currentTime = Date.now();
      const elapsedTime = (currentTime - this.serverStartTime) / 1000;
      const audioPosition = elapsedTime % this.audioDuration;
      
      console.log(`🎵 Syncing audio: ${elapsedTime.toFixed(1)}s elapsed, setting position to ${audioPosition.toFixed(1)}s`);
      this.$refs.lofiAudio.currentTime = audioPosition;
    },
    
    // Utility functions
    formatTime(timestamp) {
      return new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    
    scrollToBottom() {
      this.$nextTick(() => {
        if (this.$refs.chatMessages) {
          this.$refs.chatMessages.scrollTop = this.$refs.chatMessages.scrollHeight;
        }
      });
    },
  },
};
</script>

<style scoped>
/* Lofi Vibes CSS - Vue Component Styles */
.ai-streamer-container {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: linear-gradient(135deg, #1a1612 0%, #252017 100%);
  color: #e8d5b7;
  min-height: 100vh;
  margin: 0;
  padding: 0;
}

.header {
  padding: 1.5rem 2rem;
  background: rgba(37, 32, 23, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #3a3025;
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1600px;
  margin: 0 auto;
}

.logo {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.8rem;
  font-weight: 500;
  color: #d4844a;
  text-shadow: 0 0 20px rgba(212, 132, 74, 0.15);
  margin: 0;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.ca-address {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9rem;
  color: #d4844a;
}

.social-links {
  display: flex;
  gap: 1rem;
}

.social-link {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1rem;
  color: #c4a882;
  text-decoration: none;
  transition: color 0.2s ease;
}

.social-link:hover {
  color: #d4844a;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #2d261b;
  border: 1px solid #3a3025;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #c4a882;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #7fa86b;
  box-shadow: 0 0 8px #7fa86b;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.content-area {
  flex: 1;
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 2rem;
  padding: 2rem;
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
}

/* Chat Styles */
.chat-section {
  display: flex;
  flex-direction: column;
}

.chat-window {
  background: #252017;
  border: 1px solid #3a3025;
  border-radius: 16px;
  overflow: hidden;
  height: 70vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.chat-header {
  background: #2d261b;
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #3a3025;
}

.chat-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 500;
  color: #e8d5b7;
  font-size: 1.1rem;
}

.chat-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9rem;
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff4757;
  box-shadow: 0 0 8px #ff4757;
  animation: pulse 2s infinite;
}

.live-text {
  color: #ff4757;
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
}

.viewer-count {
  color: #c4a882;
  font-size: 0.85rem;
  padding: 0.25rem 0.5rem;
  background: #252017;
  border-radius: 8px;
  border: 1px solid #3a3025;
}

.chat-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #1a1612;
  min-height: 0;
  overflow: hidden;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  padding-bottom: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  scroll-behavior: smooth;
  min-height: 0;
}

.chat-message {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  animation: slideInLeft 0.3s ease-out;
  padding: 0.5rem 0;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.chat-message:hover {
  background: rgba(212, 132, 74, 0.05);
  padding: 0.5rem;
  margin: 0 -0.5rem;
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.message-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
}

.username {
  font-weight: 600;
  font-size: 0.9rem;
  color: #d4844a;
}

.username.ai {
  color: #ffb366;
}

.ai-badge {
  font-size: 0.7rem;
  padding: 0.125rem 0.375rem;
  border-radius: 10px;
  text-transform: uppercase;
  font-weight: 600;
  background: #ffb366;
  color: #1a1612;
}

.timestamp {
  font-size: 0.75rem;
  color: #8a7a65;
  margin-left: auto;
}

.message-content {
  font-size: 0.95rem;
  line-height: 1.4;
  color: #e8d5b7;
  word-wrap: break-word;
  margin-left: 0.25rem;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(212, 132, 74, 0.1);
  border-radius: 8px;
  animation: slideInLeft 0.3s ease-out;
}

.typing-user {
  font-size: 0.9rem;
  color: #ffb366;
}

.typing-dots {
  display: flex;
  gap: 4px;
}

.typing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #d4844a;
  animation: typing 1.4s infinite;
}

@keyframes typing {
  0%, 60%, 100% { opacity: 0.3; }
  30% { opacity: 1; }
}

.chat-input-container {
  padding: 1rem 1.5rem;
  background: #2d261b;
  border-top: 1px solid #3a3025;
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-shrink: 0;
  position: relative;
  z-index: 10;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
}

.chat-input {
  flex: 1;
  padding: 0.75rem 1rem;
  background: #252017;
  border: 1px solid #3a3025;
  border-radius: 12px;
  color: #e8d5b7;
  font-size: 0.95rem;
  outline: none;
  transition: all 0.2s ease;
}

.chat-input:focus {
  border-color: #d4844a;
  box-shadow: 0 0 0 3px rgba(212, 132, 74, 0.15);
}

.chat-input::placeholder {
  color: #8a7a65;
}

.send-button {
  padding: 0.75rem 1.25rem;
  background: #d4844a;
  color: #1a1612;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.send-button:hover {
  background: #e8956b;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(212, 132, 74, 0.15);
}

/* Visual Section */
.visual-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  height: 70vh;
}

.gif-container {
  background: #252017;
  border: 1px solid #3a3025;
  border-radius: 16px;
  overflow: hidden;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.lofi-gif {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 16px;
}

/* Audio Controls */
.audio-controls {
  background: #252017;
  border: 1px solid #3a3025;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.audio-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.now-playing {
  font-size: 0.9rem;
  color: #c4a882;
  font-family: 'JetBrains Mono', monospace;
}

.volume-btn {
  background: #2d261b;
  border: 1px solid #3a3025;
  border-radius: 8px;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 50px;
  height: 50px;
  font-size: 1.2rem;
}

.volume-btn:hover {
  background: #d4844a;
  border-color: #d4844a;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(212, 132, 74, 0.15);
}

/* Responsive Design */
@media (max-width: 1024px) {
  .content-area {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .visual-section {
    order: -1;
    height: 50vh;
  }
}

@media (max-width: 768px) {
  .header {
    padding: 1rem;
  }
  
  .header-info {
    flex-direction: column;
    gap: 1rem;
  }
  
  .content-area {
    padding: 1rem;
    gap: 1rem;
  }
  
  .chat-window {
    height: 60vh;
  }
  
  .visual-section {
    height: 45vh;
  }
}
</style>
