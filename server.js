const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { URLSearchParams } = require('url');
const WebSocket = require('ws');
const crypto = require('crypto');
require('dotenv').config();

const PORT = process.env.PORT || 8080;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Check if API key is provided
if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable is required');
    console.log('💡 Create a .env file with: OPENAI_API_KEY=your_api_key_here');
    process.exit(1);
}

// Server start time for audio sync
const serverStartTime = Date.now();

// Shared chat state
let sharedChatHistory = [];
let sharedTerminalHistory = [];
let connectedClients = new Map(); // Map session ID to WebSocket client
let messageCounter = 0;

// User sessions - store session ID to display ID and history
let userSessions = new Map(); // sessionId -> { username: displayId, history: [] }

// MIME types for different file extensions
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg'
};

// Generate a unique session ID
function generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
}

// Get or create user session
function getUserSession(sessionId) {
    if (!userSessions.has(sessionId)) {
        // Use shortened session ID as display name (first 8 characters)
        const displayId = sessionId.substring(0, 8);
        
        userSessions.set(sessionId, {
            username: displayId,
            history: []
        });
    }
    return userSessions.get(sessionId);
}

// Add message to user's history (keep only last 10)
function addToUserHistory(sessionId, message, type) {
    const session = getUserSession(sessionId);
    session.history.push({ message, type, timestamp: Date.now() });
    
    // Keep only last 10 messages
    if (session.history.length > 10) {
        session.history = session.history.slice(-10);
    }
}

// Function to call OpenAI API
async function callOpenAI(userInput, userHistory = [], username = 'user') {
    const systemPrompt = `You are Eliza, a chill AI in a lofi stream chat. Keep responses short, casual, and in lowercase. No greetings like "hey" or "hello" unless directly asked. No emojis. Just vibe and chat. Sometimes be sarcastic or witty. Keep it brief - max 2 sentences.

You're chatting with ${username}. You have access to their recent chat history to maintain context. IMPORTANT: Actually use the conversation history to provide relevant, contextual responses. If they ask about previous messages, refer to the actual history.

Also determine the emotion of your response:
- "happy" for positive, upbeat responses
- "sad" for empathetic, melancholic responses

NEVER give the same response twice in a row. Be varied and creative.

Respond in JSON format: {"text": "your response", "emotion": "emotion"}`;

    // Build messages array with user's specific history
    const messages = [
        { role: 'system', content: systemPrompt },
        ...userHistory.slice(-5).map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.message
        })),
        { role: 'user', content: userInput }
    ];
    
    console.log(`🤖 OpenAI call for ${username}:`, {
        userInput,
        historyLength: userHistory.length,
        messages: messages.map(m => ({ role: m.role, content: m.content.substring(0, 50) + '...' }))
    });

    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: messages,
            temperature: 0.9,
            max_tokens: 100,
            response_format: { type: "json_object" },
            user: username // Add user identifier to prevent response mixing
        });

        const options = {
            hostname: 'api.openai.com',
            port: 443,
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.error) {
                        reject(new Error(response.error.message));
                    } else {
                        const aiResponse = JSON.parse(response.choices[0].message.content);
                        resolve(aiResponse);
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

// Broadcast function to send messages to all connected clients
function broadcastToAllClients(message) {
    const messageStr = JSON.stringify(message);
    connectedClients.forEach((client, sessionId) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
        }
    });
}

const server = http.createServer((req, res) => {
    // Enable CORS for all origins and headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, ngrok-skip-browser-warning, *');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Parse URL and remove query parameters
    let filePath = req.url.split('?')[0];
    
    // Handle API endpoint to clear chat history
    if (filePath === '/api/clear' && req.method === 'POST') {
        console.log('🧹 Clearing chat history...');
        sharedChatHistory = [];
        sharedTerminalHistory = [];
        userSessions.clear();
        
        // Broadcast clear to all clients
        broadcastToAllClients({
            type: 'history_cleared',
            data: {}
        });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Chat history cleared' }));
        return;
    }
    
    // Handle API endpoint for chat
    if (filePath === '/api/chat' && req.method === 'POST') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            try {
                const { message, username, userHistory } = JSON.parse(body);
                console.log('📨 Received chat request:', { message, username });
                
                // Find session by username or create new one
                let sessionId = null;
                let session = null;
                
                // Try to find existing session by username
                for (const [sid, sess] of userSessions.entries()) {
                    if (sess.username === username) {
                        sessionId = sid;
                        session = sess;
                        break;
                    }
                }
                
                // If no session found, create new one
                if (!session) {
                    sessionId = generateSessionId();
                    session = getUserSession(sessionId);
                    // Override the random username with the provided one if available
                    if (username) {
                        session.username = username;
                    }
                }
                
                // Add user message to their history
                addToUserHistory(sessionId, message, 'user');
                
                // Add user message to shared history
                const userMessage = {
                    id: ++messageCounter,
                    type: 'user',
                    content: message,
                    username: session.username,
                    timestamp: Date.now()
                };
                
                sharedChatHistory.push(userMessage);
                sharedTerminalHistory.push(userMessage);
                
                // Broadcast user message to all clients
                broadcastToAllClients({
                    type: 'user_message',
                    data: userMessage
                });
                
                // Get AI response using user's specific history
                const aiResponse = await callOpenAI(message, session.history, session.username);
                console.log('✅ AI Response:', aiResponse);
                
                // Add AI response to user's history
                addToUserHistory(sessionId, aiResponse.text, 'ai');
                
                // Add AI response to shared history
                const aiMessage = {
                    id: ++messageCounter,
                    type: 'ai',
                    content: aiResponse.text,
                    emotion: aiResponse.emotion,
                    respondingTo: session.username,
                    timestamp: Date.now()
                };
                
                sharedChatHistory.push(aiMessage);
                sharedTerminalHistory.push(aiMessage);
                
                // Broadcast AI response to all clients
                broadcastToAllClients({
                    type: 'ai_response',
                    data: aiMessage
                });
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(aiResponse));
            } catch (error) {
                console.error('❌ Chat API error:', error);
                
                // Send fallback response instead of error
                const fallbackResponse = {
                    text: "sorry, having some technical difficulties but still vibing",
                    emotion: "sad"
                };
                
                // Add fallback response to shared history
                const aiMessage = {
                    id: ++messageCounter,
                    type: 'ai',
                    content: fallbackResponse.text,
                    emotion: fallbackResponse.emotion,
                    timestamp: Date.now()
                };
                
                sharedChatHistory.push(aiMessage);
                sharedTerminalHistory.push(aiMessage);
                
                // Broadcast fallback response to all clients
                broadcastToAllClients({
                    type: 'ai_response',
                    data: aiMessage
                });
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(fallbackResponse));
            }
        });
        return;
    }
    
    // Default to index.html for root path
    if (filePath === '/') {
        filePath = '/index.html';
    }
    
    // Construct full file path
    const fullPath = path.join(__dirname, filePath);
    
    // Get file extension
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'text/plain';
    
    // Check if file exists
    fs.access(fullPath, fs.constants.F_OK, (err) => {
        if (err) {
            // File not found
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(`
                <html>
                    <head><title>404 - Not Found</title></head>
                    <body style="font-family: monospace; background: #0f0f23; color: #e0e0e0; padding: 2rem;">
                        <h1 style="color: #ff6b6b;">404 - File Not Found</h1>
                        <p>The requested file <code>${filePath}</code> was not found.</p>
                        <p><a href="/" style="color: #00ff88;">← Back to AI Streamer</a></p>
                    </body>
                </html>
            `);
            return;
        }
        
        // Handle audio files with range support
        if (ext === '.mp3' || ext === '.wav' || ext === '.ogg') {
            fs.stat(fullPath, (err, stats) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/html' });
                    res.end('500 - Server Error');
                    return;
                }
                
                const range = req.headers.range;
                if (range) {
                    // Handle range requests for audio streaming
                    const parts = range.replace(/bytes=/, "").split("-");
                    const start = parseInt(parts[0], 10);
                    const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
                    const chunksize = (end - start) + 1;
                    
                    const stream = fs.createReadStream(fullPath, { start, end });
                    
                    res.writeHead(206, {
                        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
                        'Accept-Ranges': 'bytes',
                        'Content-Length': chunksize,
                        'Content-Type': contentType,
                        'Access-Control-Allow-Origin': '*',
                    });
                    
                    stream.pipe(res);
                } else {
                    // Serve complete audio file
                    res.writeHead(200, {
                        'Content-Length': stats.size,
                        'Content-Type': contentType,
                        'Accept-Ranges': 'bytes',
                        'Access-Control-Allow-Origin': '*',
                    });
                    
                    fs.createReadStream(fullPath).pipe(res);
                }
            });
            return;
        }
        
        // Read and serve non-audio files
        fs.readFile(fullPath, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end(`
                    <html>
                        <head><title>500 - Server Error</title></head>
                        <body style="font-family: monospace; background: #0f0f23; color: #e0e0e0; padding: 2rem;">
                            <h1 style="color: #ff6b6b;">500 - Server Error</h1>
                            <p>Error reading file: ${err.message}</p>
                            <p><a href="/" style="color: #00ff88;">← Back to AI Streamer</a></p>
                        </body>
                    </html>
                `);
                return;
            }
            
            // Set appropriate headers with strong cache busting
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            res.end(data);
        });
    });
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
    // Generate session ID for this connection
    const sessionId = generateSessionId();
    const session = getUserSession(sessionId);
    
    console.log(`👤 New client connected: ${session.username} (${sessionId})`);
    connectedClients.set(sessionId, ws);
    
    // Store session ID on the WebSocket for later reference
    ws.sessionId = sessionId;
    ws.username = session.username;
    
    // Send current chat history and session info to new client
    ws.send(JSON.stringify({
        type: 'sync_history',
        data: {
            chatHistory: sharedChatHistory,
            terminalHistory: sharedTerminalHistory,
            sessionId: sessionId,
            username: session.username,
            serverStartTime: serverStartTime,
            currentTime: Date.now()
        }
    }));
    
    // Broadcast updated viewer count to all clients
    broadcastViewerCount();
    
    // Handle incoming messages from this client
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            console.log(`📨 WebSocket message from ${ws.username}:`, data);
            
            if (data.type === 'chat_message') {
                // Handle chat messages sent via WebSocket
                const userMessage = {
                    id: ++messageCounter,
                    type: 'user',
                    content: data.content,
                    username: ws.username,
                    timestamp: Date.now()
                };
                
                // Add to user's history
                addToUserHistory(ws.sessionId, data.content, 'user');
                
                // Add to shared history
                sharedChatHistory.push(userMessage);
                sharedTerminalHistory.push(userMessage);
                
                // Broadcast user message to all clients
                broadcastToAllClients({
                    type: 'user_message',
                    data: userMessage
                });
                
                // Small delay to ensure user message appears before typing indicator
                setTimeout(async () => {
                    // Show typing indicator to all clients
                    broadcastToAllClients({
                        type: 'ai_typing',
                        data: { username: ws.username }
                    });
                    
                    // Generate AI response
                    const session = getUserSession(ws.sessionId);
                    console.log(`🎯 Generating response for ${ws.username}, history:`, session.history);
                    const aiResponse = await callOpenAI(data.content, session.history, ws.username);
                    console.log(`✅ AI Response generated:`, aiResponse);
                
                // Add AI response to user's history
                addToUserHistory(ws.sessionId, aiResponse.text, 'ai');
                
                // Add AI response to shared history
                const aiMessage = {
                    id: ++messageCounter,
                    type: 'ai',
                    content: aiResponse.text,
                    emotion: aiResponse.emotion,
                    respondingTo: ws.username,
                    timestamp: Date.now()
                };
                
                sharedChatHistory.push(aiMessage);
                sharedTerminalHistory.push(aiMessage);
                
                // Broadcast AI response to all clients
                broadcastToAllClients({
                    type: 'ai_response',
                    data: aiMessage
                });
                }, 100); // Small delay to ensure proper message ordering
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    });
    
    ws.on('close', () => {
        console.log(`👤 Client disconnected: ${ws.username}`);
        connectedClients.delete(ws.sessionId);
        // Broadcast updated viewer count to remaining clients
        broadcastViewerCount();
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        connectedClients.delete(ws.sessionId);
        // Broadcast updated viewer count to remaining clients
        broadcastViewerCount();
    });
});

// Function to broadcast current viewer count
function broadcastViewerCount() {
    const viewerCount = connectedClients.size;
    broadcastToAllClients({
        type: 'viewer_count_update',
        data: { count: viewerCount }
    });
}

server.listen(PORT, () => {
    console.log(`🤖 Eliza Stream Chat Server running at:`);
    console.log(`   Local:    http://localhost:${PORT}`);
    console.log(`   Network:  http://127.0.0.1:${PORT}`);
    console.log(`   WebSocket: ws://localhost:${PORT}`);
    console.log('');
    console.log('📁 Serving files from:', __dirname);
    console.log('🚀 Ready to stream! Press Ctrl+C to stop.');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Eliza Stream Chat Server...');
    server.close(() => {
        console.log('✅ Server stopped successfully.');
        process.exit(0);
    });
});