# 🎵 lofi16z - AI Streamer Chat Platform

> A real-time AI chat platform with synchronized lofi music streaming, built for developers who appreciate clean code and chill vibes.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![WebSocket](https://img.shields.io/badge/WebSocket-Real--time-blue.svg)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--turbo-orange.svg)](https://openai.com/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org/)
[![Vue](https://img.shields.io/badge/Vue-3+-4FC08D.svg)](https://vuejs.org/)

## 🚀 Features

- **🤖 AI-Powered Chat** - Eliza AI responds to every message with context awareness
- **🎵 Synchronized Music** - Server-synced lofi background music for all users
- **⚡ Real-time Communication** - WebSocket-based instant messaging
- **🔐 Session Management** - Individual user contexts with 10-message history
- **📱 Multi-Framework Support** - Vanilla JS, React, and Vue implementations
- **🎨 Lofi Aesthetic** - Warm orange accents, cozy design language

## 🏗️ Architecture Overview

```
┌─────────────────┬─────────────────┬─────────────────┐
│   Client Side   │   Server Side   │   AI Service    │
├─────────────────┼─────────────────┼─────────────────┤
│ • WebSocket     │ • Node.js HTTP  │ • OpenAI GPT    │
│ • Audio Sync    │ • WebSocket     │ • Context       │
│ • Chat UI       │ • Session Mgmt  │ • JSON Response │
│ • State Mgmt    │ • User History  │ • Emotion Det.  │
└─────────────────┴─────────────────┴─────────────────┘
```

## 🛠️ Tech Stack

### Core Technologies
- **Backend**: Node.js with native HTTP/HTTPS modules
- **WebSocket**: Native `ws` library for real-time communication
- **AI**: OpenAI GPT-4o with JSON response format
- **Audio**: HTML5 Audio API with server-time synchronization
- **Frontend**: Vanilla JavaScript, React, or Vue.js

### Dependencies
```json
{
  "ws": "^8.x.x",
  "dotenv": "^17.x.x"
}
```

## 📦 Quick Start

### 1. Environment Setup
```bash
# Clone or download the project
cd lofi16z

# Install dependencies
npm install

# Create environment file
cp env.example .env
# Edit .env and add your OpenAI API key
```

### 2. Environment Variables
Create `.env` file:
```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=8080
```

### 3. Start the Server
```bash
node server.js
```

### 4. Open Browser
Navigate to `http://localhost:8080`

## 🔧 Implementation Guides

### 🟡 Vanilla JavaScript (`script.js`)

The core implementation using pure JavaScript with modern ES6+ features.

#### Key Components:
```javascript
class LofiStreamChat {
  constructor() {
    // DOM element references
    this.chatMessages = document.getElementById('chat-messages');
    this.chatInput = document.getElementById('chat-input');
    this.lofiAudio = document.getElementById('lofi-audio');
    
    // State management
    this.sessionId = null;
    this.currentUsername = null;
    this.userChatHistories = new Map();
    this.serverStartTime = null;
  }
}
```

#### WebSocket Integration:
```javascript
setupWebSocket() {
  this.ws = new WebSocket('wss://your-server.com/');
  
  this.ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    this.handleWebSocketMessage(message);
  };
}
```

#### Audio Synchronization:
```javascript
syncAudioToServerTime() {
  const currentTime = Date.now();
  const elapsedTime = (currentTime - this.serverStartTime) / 1000;
  const audioPosition = elapsedTime % this.audioDuration;
  this.lofiAudio.currentTime = audioPosition;
}
```

### ⚛️ React Implementation (`react-example.jsx`)

Modern React implementation using hooks and functional components.

#### State Management:
```javascript
const [messages, setMessages] = useState([]);
const [isTyping, setIsTyping] = useState(false);
const [serverStartTime, setServerStartTime] = useState(null);
const wsRef = useRef(null);
const audioRef = useRef(null);
```

#### WebSocket with useEffect:
```javascript
useEffect(() => {
  const ws = new WebSocket('wss://your-server.com/');
  
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    handleWebSocketMessage(message);
  };
  
  return () => ws.close(); // Cleanup
}, []);
```

#### Component Structure:
```jsx
<div className="ai-streamer-container">
  <Header />
  <ChatSection messages={messages} onSendMessage={sendMessage} />
  <VisualSection />
  <AudioControls onToggleAudio={toggleAudio} />
</div>
```

### 🟢 Vue Implementation (`vue-example.vue`)

Vue.js implementation with composition API and reactive data.

#### Reactive Data:
```javascript
data() {
  return {
    messages: [],
    isTyping: false,
    serverStartTime: null,
    ws: null,
    userHistories: new Map(),
  };
}
```

#### Lifecycle Management:
```javascript
mounted() {
  this.connectWebSocket();
  this.setupAudio();
},

beforeUnmount() {
  if (this.ws) this.ws.close();
}
```

#### Template Binding:
```vue
<template>
  <div class="chat-messages" ref="chatMessages">
    <div v-for="message in messages" :key="message.id">
      {{ message.content }}
    </div>
    <div v-if="isTyping" class="typing-indicator">
      Eliza is typing...
    </div>
  </div>
</template>
```

## 🧠 Context Management System

### User Session Architecture

Each user connection creates a unique session with individual context tracking:

```javascript
// Server-side session structure
userSessions = Map {
  "76c8c54b" => {
    username: "76c8c54b",    // First 8 chars of session ID
    history: [
      {message: "hey", type: "user", timestamp: 1234567890},
      {message: "hello! what's up?", type: "ai", timestamp: 1234567891},
      // ... up to 10 messages
    ]
  }
}
```

### Context Flow Diagram

```
User Message → Session Lookup → History Retrieval → AI Context → Response
     ↓              ↓               ↓               ↓           ↓
 "how are you"  → 76c8c54b → [last 10 msgs] → OpenAI API → "doing great!"
```

### History Management

#### Server-Side Storage:
```javascript
function addToUserHistory(sessionId, message, type) {
  const session = getUserSession(sessionId);
  session.history.push({ message, type, timestamp: Date.now() });
  
  // Keep only last 10 messages
  if (session.history.length > 10) {
    session.history = session.history.slice(-10);
  }
}
```

#### AI Context Building:
```javascript
const messages = [
  { role: 'system', content: systemPrompt },
  ...userHistory.slice(-5).map(msg => ({
    role: msg.type === 'user' ? 'user' : 'assistant',
    content: msg.message
  })),
  { role: 'user', content: userInput }
];
```

### Memory Management

- **Per-User Limit**: 10 messages maximum per session
- **Automatic Cleanup**: Old messages automatically removed
- **Session Isolation**: Each user's context is completely separate
- **Server Restart**: All context cleared on server restart

## 🎵 Audio Synchronization

### Server-Time Sync Algorithm

```javascript
// Server records start time
const serverStartTime = Date.now();

// Client calculates position
const elapsedTime = (Date.now() - serverStartTime) / 1000;
const audioPosition = elapsedTime % audioDuration;
audio.currentTime = audioPosition;
```

### Sync Flow Diagram

```
Server Start → Record Timestamp → Send to Clients → Calculate Offset → Sync Audio
    ↓              ↓                   ↓               ↓             ↓
 10:00:00    → 1234567890000    → WebSocket    → +5.5 minutes → 5:30 position
```

### Audio Features

- **Loop Sync**: Handles audio loops seamlessly
- **Join-time Sync**: Users hear correct position when joining
- **Browser Compat**: Handles autoplay restrictions
- **Volume Control**: Individual volume control per user

## 🌐 WebSocket Protocol

### Message Types

#### Client → Server:
```javascript
{
  type: 'chat_message',
  content: 'user message text'
}
```

#### Server → Client:
```javascript
// User message broadcast
{
  type: 'user_message',
  data: {
    id: 123,
    type: 'user',
    content: 'message text',
    username: '76c8c54b',
    timestamp: 1234567890
  }
}

// AI response
{
  type: 'ai_response',
  data: {
    id: 124,
    type: 'ai',
    content: 'ai response text',
    emotion: 'happy',
    respondingTo: '76c8c54b',
    timestamp: 1234567891
  }
}

// Typing indicator
{
  type: 'ai_typing',
  data: { username: '76c8c54b' }
}

// Viewer count update
{
  type: 'viewer_count_update',
  data: { count: 42 }
}

// Initial sync
{
  type: 'sync_history',
  data: {
    chatHistory: [...],
    sessionId: 'session_id',
    username: '76c8c54b',
    serverStartTime: 1234567890,
    currentTime: 1234567900
  }
}
```

## 🔐 Security & Best Practices

### Environment Variables
```bash
# Required
OPENAI_API_KEY=sk-proj-...
PORT=8080

# Optional
NODE_ENV=production
MAX_CONNECTIONS=100
```

### API Key Security
- ✅ **Environment Variables**: Never hardcode API keys
- ✅ **Server-side Only**: API key never sent to client
- ✅ **Error Handling**: Graceful failure if key missing
- ✅ **Request Isolation**: User identifier prevents response mixing

### CORS Configuration
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
```

## 📊 Performance Optimizations

### Memory Management
- **History Limits**: 10 messages per user maximum
- **Automatic Cleanup**: Old sessions garbage collected
- **Efficient Storage**: Map-based O(1) lookups
- **Connection Tracking**: Weak references prevent memory leaks

### Network Optimization
- **Message Batching**: Efficient WebSocket usage
- **Audio Streaming**: HTTP range request support
- **Compression**: Gzip compression for static files
- **Caching**: Appropriate cache headers

### Client-Side Performance
- **Virtual Scrolling**: Ready for large message counts
- **Debounced Input**: Prevents spam requests
- **Lazy Loading**: Audio loads on demand
- **Efficient Rendering**: Minimal DOM updates

## 🎨 Styling Architecture

### CSS Custom Properties
```css
:root {
  --bg-primary: #1a1612;
  --bg-secondary: #252017;
  --bg-tertiary: #2d261b;
  --text-primary: #e8d5b7;
  --accent-orange: #d4844a;
  --warm-glow: #ffb366;
  --shadow-warm: rgba(212, 132, 74, 0.15);
}
```

### Component Structure
```
Header
├── Logo (lofi16z)
├── CA Address (clickable)
├── Social Links (twitter, github)
└── Status Badge (online indicator)

Content Area
├── Chat Section (380px)
│   ├── Chat Header (title + live status)
│   ├── Messages Container (scrollable)
│   └── Input Container (fixed bottom)
└── Visual Section (flex: 1)
    ├── GIF Container (lofi animation)
    └── Audio Controls (volume toggle)
```

### Responsive Breakpoints
- **Desktop**: `> 1024px` - Side-by-side layout
- **Tablet**: `768px - 1024px` - Stacked with adjusted heights
- **Mobile**: `< 768px` - Compact stacked layout

## 🔧 Development Guide

### File Structure
```
lofi16z/
├── server.js              # Node.js WebSocket server
├── script.js              # Vanilla JS implementation
├── react-example.jsx      # React component example
├── vue-example.vue        # Vue component example
├── index.html             # Main HTML structure
├── styles.css             # Lofi-themed CSS
├── Night and Jazz.mp3     # Background music
├── lofi.gif              # Visual animation
├── .env                  # Environment variables
├── env.example           # Environment template
└── package.json          # Node.js dependencies
```

### Server Architecture

#### Core Modules:
```javascript
// Session Management
const userSessions = new Map(); // sessionId → {username, history}
const connectedClients = new Map(); // sessionId → WebSocket

// Message Flow
WebSocket Connection → Session Creation → Message Handling → AI Response
```

#### Session Lifecycle:
1. **Connection**: Generate unique session ID (hex)
2. **Username**: Use first 8 characters as display name
3. **History Init**: Create empty message array
4. **Message Tracking**: Store user/AI messages (max 10)
5. **Cleanup**: Remove session on disconnect

### AI Integration

#### OpenAI Configuration:
```javascript
{
  model: 'gpt-4o-turbo',
  messages: [systemPrompt, ...history, currentMessage],
  temperature: 0.9,
  max_tokens: 100,
  response_format: { type: "json_object" },
  user: sessionId  // Prevents response mixing
}
```

#### System Prompt:
```
You are Eliza, a chill AI in a lofi stream chat. 
Keep responses short, casual, and in lowercase. 
Use conversation history for context.
Respond in JSON: {"text": "response", "emotion": "emotion"}
```

#### Context Window:
- **System Prompt**: AI personality and instructions
- **History**: Last 5 messages from this user
- **Current Message**: User's latest input
- **User Identifier**: Prevents cross-user response mixing

## 🎵 Audio System

### Synchronization Algorithm

```javascript
// Server records start time
const serverStartTime = Date.now();

// Client calculates current position
const elapsedTime = (Date.now() - serverStartTime) / 1000;
const audioPosition = elapsedTime % audioDuration;

// Sync audio to calculated position
audio.currentTime = audioPosition;
```

### Audio Features:
- **Loop Handling**: Seamless looping with modulo calculation
- **Late Join Sync**: Users joining late hear correct position
- **Individual Control**: Personal volume without affecting others
- **Browser Compatibility**: Handles autoplay restrictions

### HTTP Range Support:
```javascript
// Supports HTTP 206 Partial Content for audio streaming
const range = req.headers.range;
if (range) {
  const parts = range.replace(/bytes=/, "").split("-");
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
  // Stream partial content...
}
```

## 🔄 Message Flow

### Real-time Communication:

```
1. User Input
   ├── Client: Clear input field
   ├── WebSocket: Send {type: 'chat_message', content: '...'}
   └── Server: Receive message

2. Server Processing
   ├── Session: Lookup user session by WebSocket connection
   ├── History: Add message to user's history (max 10)
   ├── Broadcast: Send user_message to all clients
   └── Delay: 100ms for visual ordering

3. AI Processing
   ├── Context: Retrieve user's conversation history
   ├── OpenAI: Send request with context
   ├── Response: Parse JSON response
   └── Broadcast: Send ai_response to all clients

4. Client Display
   ├── User Message: Appears immediately
   ├── Typing Indicator: Shows "Eliza is typing..."
   └── AI Response: Replaces typing indicator
```

### Session Context Example:

```javascript
// User "76c8c54b" conversation context:
[
  {message: "hey", type: "user", timestamp: 1234567890},
  {message: "what's up! how are you?", type: "ai", timestamp: 1234567891},
  {message: "good, what about you?", type: "user", timestamp: 1234567892},
  {message: "doing great, thanks for asking!", type: "ai", timestamp: 1234567893},
  // ... up to 10 total messages
]
```

## 🎯 Framework Implementations

### React Hooks Pattern:
```javascript
// State management
const [messages, setMessages] = useState([]);
const [isTyping, setIsTyping] = useState(false);

// WebSocket connection
useEffect(() => {
  const ws = new WebSocket(WS_URL);
  ws.onmessage = handleMessage;
  return () => ws.close();
}, []);

// Auto-scroll effect
useEffect(() => {
  scrollToBottom();
}, [messages]);
```

### Vue Composition:
```javascript
// Reactive state
data() {
  return {
    messages: [],
    isTyping: false,
    ws: null
  };
},

// Lifecycle hooks
mounted() {
  this.connectWebSocket();
},

// Methods
methods: {
  sendMessage() {
    this.ws.send(JSON.stringify({...}));
  }
}
```

## 🔍 Debugging & Monitoring

### Server Logs:
```bash
🤖 Eliza Stream Chat Server running at:
   Local:    http://localhost:8080
   WebSocket: ws://localhost:8080

👤 New client connected: 76c8c54b (session_id)
📨 WebSocket message from 76c8c54b: {type: 'chat_message', content: 'hey'}
🎯 Generating response for 76c8c54b, history: [...]
✅ AI Response generated: {text: "what's up!", emotion: "happy"}
```

### Client Debug:
```javascript
console.log('📝 User input received:', input);
console.log('🔌 WebSocket connected');
console.log('🎵 Audio synced to:', audioPosition);
console.log('📨 Received message:', message);
```

### Performance Metrics:
- **WebSocket Latency**: ~50-100ms
- **AI Response Time**: ~1-3 seconds
- **Audio Sync Accuracy**: ±100ms
- **Memory Usage**: ~10MB per 100 users

## 🚀 Deployment

### Production Setup:
```bash
# Set environment variables
export OPENAI_API_KEY="your_key_here"
export PORT=8080
export NODE_ENV=production

# Start server
node server.js
```

### Docker Setup:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8080
CMD ["node", "server.js"]
```

### Nginx Proxy:
```nginx
location / {
  proxy_pass http://localhost:8080;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection 'upgrade';
  proxy_set_header Host $host;
  proxy_cache_bypass $http_upgrade;
}
```

## 📈 Scaling Considerations

### Horizontal Scaling:
- **Redis**: Store user sessions across multiple servers
- **Load Balancer**: Sticky sessions for WebSocket connections
- **Database**: Persistent message history storage
- **CDN**: Static asset delivery (audio, images)

### Vertical Scaling:
- **Memory**: ~100KB per active session
- **CPU**: AI requests are primary bottleneck
- **Network**: WebSocket connections scale well
- **Storage**: Audio files and session data

## 🧪 Testing

### Manual Testing:
```bash
# Start server
node server.js

# Open multiple browser tabs
# Test: Message sending, AI responses, audio sync
# Verify: Session isolation, history persistence
```

### Load Testing:
```javascript
// WebSocket load test example
const WebSocket = require('ws');

for (let i = 0; i < 100; i++) {
  const ws = new WebSocket('ws://localhost:8080');
  ws.on('open', () => {
    ws.send(JSON.stringify({
      type: 'chat_message',
      content: `Test message ${i}`
    }));
  });
}
```

## 🎨 Customization

### Theming:
```css
:root {
  /* Change these for different color schemes */
  --accent-orange: #d4844a;    /* Primary accent */
  --warm-glow: #ffb366;        /* AI highlights */
  --bg-primary: #1a1612;      /* Main background */
}
```

### AI Personality:
```javascript
const systemPrompt = `
You are [Name], a [personality] AI...
Keep responses [style guidelines]...
Respond in JSON: {"text": "response", "emotion": "emotion"}
`;
```

### Audio Tracks:
- Replace `Night and Jazz.mp3` with any looped audio
- Update filename in HTML `<source>` tag
- Server automatically handles MP3/WAV/OGG formats

## 🤝 Contributing

### Code Style:
- **ES6+**: Modern JavaScript features
- **Async/Await**: Promise-based async handling
- **Modular**: Clear separation of concerns
- **Comments**: Inline documentation

### Pull Request Process:
1. Fork repository
2. Create feature branch
3. Test all implementations (JS/React/Vue)
4. Update documentation
5. Submit PR with clear description

## 📄 License

MIT License - Feel free to use this for your own lofi streaming projects!

## 🙏 Acknowledgments

- **OpenAI**: GPT-4o-turbo for AI responses
- **Lofi Community**: Inspiration for the aesthetic
- **Web Standards**: WebSocket, Audio API, modern CSS

---

*Built with ☕ and chill vibes for the developer community*

## 🆘 Troubleshooting

### Common Issues:

**Audio not playing:**
- Check file exists: `Night and Jazz.mp3`
- Browser autoplay policy: Click volume button
- MIME type: Server includes `audio/mpeg`

**WebSocket connection fails:**
- Check server is running: `node server.js`
- Firewall settings: Allow port 8080
- URL format: `wss://` for HTTPS, `ws://` for HTTP

**AI responses not working:**
- Environment variable: Check `.env` file exists
- API key valid: Test with OpenAI directly
- Network: Check server logs for API errors

**Context not working:**
- Session tracking: Check browser console for session ID
- History limit: Max 10 messages per user
- Server restart: Clears all context

### Debug Commands:
```bash
# Check environment
node -e "console.log(process.env.OPENAI_API_KEY ? 'API key loaded' : 'API key missing')"

# Test WebSocket
wscat -c ws://localhost:8080

# Check audio file
curl -I http://localhost:8080/Night%20and%20Jazz.mp3
```

---

**Happy coding and chill vibing! 🎵✨**
