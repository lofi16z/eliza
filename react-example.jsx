// React Example - AI Streamer Chat with Music
// No external libraries needed - uses built-in React hooks and Web APIs

import React, { useState, useEffect, useRef, useCallback } from 'react';

const AIStreamerChat = () => {
  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentUsername, setCurrentUsername] = useState(null);
  const [viewerCount, setViewerCount] = useState(0);
  
  // Audio state
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [serverStartTime, setServerStartTime] = useState(null);
  const [audioDuration, setAudioDuration] = useState(null);
  
  // Refs
  const wsRef = useRef(null);
  const audioRef = useRef(null);
  const chatMessagesRef = useRef(null);
  const sessionIdRef = useRef(null);
  const userHistoryRef = useRef(new Map());
  
  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    const ws = new WebSocket('wss://be5ad9cb5146.ngrok-free.app/');
    
    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      wsRef.current = ws;
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    };
    
    ws.onclose = () => {
      console.log('❌ WebSocket disconnected');
      setTimeout(connectWebSocket, 3000);
    };
    
    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };
  }, []);
  
  // Handle WebSocket messages
  const handleWebSocketMessage = (message) => {
    switch (message.type) {
      case 'sync_history':
        // Set session info
        if (message.data.sessionId) {
          sessionIdRef.current = message.data.sessionId;
        }
        if (message.data.username) {
          setCurrentUsername(message.data.username);
        }
        if (message.data.serverStartTime) {
          setServerStartTime(message.data.serverStartTime);
        }
        
        // Sync chat history
        const chatHistory = message.data.chatHistory || [];
        setMessages(chatHistory.map(msg => ({
          id: msg.id,
          type: msg.type,
          content: msg.content,
          username: msg.username || 'user',
          timestamp: msg.timestamp
        })));
        break;
        
      case 'user_message':
        setMessages(prev => [...prev, {
          id: message.data.id,
          type: 'user',
          content: message.data.content,
          username: message.data.username,
          timestamp: message.data.timestamp
        }]);
        break;
        
      case 'ai_typing':
        setIsTyping(true);
        break;
        
      case 'ai_response':
        setIsTyping(false);
        setMessages(prev => [...prev, {
          id: message.data.id,
          type: 'ai',
          content: message.data.content,
          username: 'Eliza',
          timestamp: message.data.timestamp
        }]);
        break;
        
      case 'viewer_count_update':
        setViewerCount(message.data.count);
        break;
    }
  };
  
  // Audio sync functionality
  const syncAudioToServerTime = useCallback(() => {
    if (!serverStartTime || !audioDuration || !audioRef.current) return;
    
    const currentTime = Date.now();
    const elapsedTime = (currentTime - serverStartTime) / 1000;
    const audioPosition = elapsedTime % audioDuration;
    
    console.log(`🎵 Syncing audio: ${elapsedTime.toFixed(1)}s elapsed, setting position to ${audioPosition.toFixed(1)}s`);
    audioRef.current.currentTime = audioPosition;
  }, [serverStartTime, audioDuration]);
  
  // Audio control functions
  const toggleAudio = () => {
    if (!audioRef.current) return;
    
    if (!isAudioPlaying) {
      if (serverStartTime) {
        syncAudioToServerTime();
      }
      audioRef.current.play().then(() => {
        setIsAudioPlaying(true);
        audioRef.current.volume = 0.3;
      }).catch(console.error);
    } else {
      audioRef.current.pause();
      audioRef.current.volume = 0;
      setIsAudioPlaying(false);
    }
  };
  
  // Chat functions
  const sendMessage = () => {
    if (!inputValue.trim() || isTyping || !wsRef.current) return;
    
    // Send via WebSocket
    wsRef.current.send(JSON.stringify({
      type: 'chat_message',
      content: inputValue.trim()
    }));
    
    setInputValue('');
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages, isTyping]);
  
  // Initialize on mount
  useEffect(() => {
    connectWebSocket();
    
    // Audio event listeners
    if (audioRef.current) {
      const audio = audioRef.current;
      
      audio.addEventListener('loadedmetadata', () => {
        setAudioDuration(audio.duration);
        console.log('🎵 Audio loaded, duration:', audio.duration);
      });
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);
  
  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.logo}>lofi16z</h1>
        <div style={styles.headerInfo}>
          <div style={styles.caAddress}>
            <span>CA: AkAESfAsKYU5qJcuhc73mKxPJe7C2SAQj7zVCBRVpump</span>
          </div>
          <div style={styles.socialLinks}>
            <a href="https://twitter.com" style={styles.socialLink}>twitter</a>
            <a href="https://github.com" style={styles.socialLink}>github</a>
          </div>
          <div style={styles.statusBadge}>
            <span style={styles.statusDot}></span>
            <span>online</span>
          </div>
        </div>
      </header>
      
      {/* Content Area */}
      <div style={styles.contentArea}>
        {/* Chat Section */}
        <div style={styles.chatSection}>
          <div style={styles.chatWindow}>
            <div style={styles.chatHeader}>
              <div style={styles.chatTitle}>
                <span>💬</span>
                <span>Stream Chat</span>
              </div>
              <div style={styles.chatStatus}>
                <span style={styles.liveDot}></span>
                <span style={styles.liveText}>LIVE</span>
                <span style={styles.viewerCount}>{viewerCount}</span>
              </div>
            </div>
            
            <div style={styles.chatBody}>
              <div style={styles.chatMessages} ref={chatMessagesRef}>
                {messages.map((message) => (
                  <div key={message.id} style={styles.chatMessage}>
                    <div style={styles.messageHeader}>
                      <span style={{
                        ...styles.username,
                        color: message.type === 'ai' ? '#ffb366' : '#d4844a'
                      }}>
                        {message.username}
                      </span>
                      {message.type === 'ai' && (
                        <span style={styles.aiBadge}>AI</span>
                      )}
                      <span style={styles.timestamp}>
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div style={styles.messageContent}>
                      {message.content}
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div style={styles.typingIndicator}>
                    <div style={styles.typingUser}>Eliza is typing</div>
                    <div style={styles.typingDots}>
                      <span style={styles.typingDot}></span>
                      <span style={{...styles.typingDot, animationDelay: '0.2s'}}></span>
                      <span style={{...styles.typingDot, animationDelay: '0.4s'}}></span>
                    </div>
                  </div>
                )}
              </div>
              
              <div style={styles.chatInputContainer}>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Say something..."
                  style={styles.chatInput}
                />
                <button onClick={sendMessage} style={styles.sendButton}>
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Visual Section */}
        <div style={styles.visualSection}>
          <div style={styles.gifContainer}>
            <img src="lofi.gif" alt="Lofi vibes" style={styles.lofiGif} />
          </div>
          
          <div style={styles.audioControls}>
            <div style={styles.audioInfo}>
              <span style={styles.nowPlaying}>🎵 Night and Jazz</span>
              <button onClick={toggleAudio} style={styles.volumeBtn}>
                <span>{isAudioPlaying ? '🔉' : '🔇'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Hidden Audio Element */}
      <audio ref={audioRef} loop preload="auto">
        <source src="Night and Jazz.mp3" type="audio/mpeg" />
      </audio>
    </div>
  );
};

// Styles object (inline styles for simplicity)
const styles = {
  container: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    background: 'linear-gradient(135deg, #1a1612 0%, #252017 100%)',
    color: '#e8d5b7',
    minHeight: '100vh',
    margin: 0,
    padding: 0,
  },
  header: {
    padding: '1.5rem 2rem',
    background: 'rgba(37, 32, 23, 0.8)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid #3a3025',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1600px',
    margin: '0 auto',
  },
  logo: {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '1.8rem',
    fontWeight: 500,
    color: '#d4844a',
    textShadow: '0 0 20px rgba(212, 132, 74, 0.15)',
    margin: 0,
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem',
  },
  caAddress: {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '0.9rem',
    color: '#d4844a',
  },
  socialLinks: {
    display: 'flex',
    gap: '1rem',
  },
  socialLink: {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '1rem',
    color: '#c4a882',
    textDecoration: 'none',
    transition: 'color 0.2s ease',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    background: '#2d261b',
    border: '1px solid #3a3025',
    borderRadius: '8px',
    fontSize: '0.9rem',
    color: '#c4a882',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#7fa86b',
    boxShadow: '0 0 8px #7fa86b',
  },
  contentArea: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '380px 1fr',
    gap: '2rem',
    padding: '2rem',
    maxWidth: '1600px',
    margin: '0 auto',
    width: '100%',
  },
  chatSection: {
    display: 'flex',
    flexDirection: 'column',
  },
  chatWindow: {
    background: '#252017',
    border: '1px solid #3a3025',
    borderRadius: '16px',
    overflow: 'hidden',
    height: '70vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },
  chatHeader: {
    background: '#2d261b',
    padding: '1rem 1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #3a3025',
  },
  chatTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontWeight: 500,
    color: '#e8d5b7',
    fontSize: '1.1rem',
  },
  chatStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '0.9rem',
  },
  liveDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#ff4757',
    boxShadow: '0 0 8px #ff4757',
    animation: 'pulse 2s infinite',
  },
  liveText: {
    color: '#ff4757',
    fontWeight: 600,
    fontSize: '0.85rem',
    textTransform: 'uppercase',
  },
  viewerCount: {
    color: '#c4a882',
    fontSize: '0.85rem',
    padding: '0.25rem 0.5rem',
    background: '#252017',
    borderRadius: '8px',
    border: '1px solid #3a3025',
  },
  chatBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: '#1a1612',
    minHeight: 0,
    overflow: 'hidden',
  },
  chatMessages: {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem',
    paddingBottom: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    scrollBehavior: 'smooth',
    minHeight: 0,
  },
  chatMessage: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    padding: '0.5rem 0',
    borderRadius: '8px',
    transition: 'background-color 0.2s ease',
  },
  messageHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.25rem',
  },
  username: {
    fontWeight: 600,
    fontSize: '0.9rem',
  },
  aiBadge: {
    fontSize: '0.7rem',
    padding: '0.125rem 0.375rem',
    borderRadius: '10px',
    textTransform: 'uppercase',
    fontWeight: 600,
    background: '#ffb366',
    color: '#1a1612',
  },
  timestamp: {
    fontSize: '0.75rem',
    color: '#8a7a65',
    marginLeft: 'auto',
  },
  messageContent: {
    fontSize: '0.95rem',
    lineHeight: 1.4,
    color: '#e8d5b7',
    wordWrap: 'break-word',
    marginLeft: '0.25rem',
  },
  typingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    background: 'rgba(212, 132, 74, 0.1)',
    borderRadius: '8px',
  },
  typingUser: {
    fontSize: '0.9rem',
    color: '#ffb366',
  },
  typingDots: {
    display: 'flex',
    gap: '4px',
  },
  typingDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#d4844a',
    animation: 'typing 1.4s infinite',
  },
  chatInputContainer: {
    padding: '1rem 1.5rem',
    background: '#2d261b',
    borderTop: '1px solid #3a3025',
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    flexShrink: 0,
    position: 'relative',
    zIndex: 10,
    boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
  },
  chatInput: {
    flex: 1,
    padding: '0.75rem 1rem',
    background: '#252017',
    border: '1px solid #3a3025',
    borderRadius: '12px',
    color: '#e8d5b7',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  sendButton: {
    padding: '0.75rem 1.25rem',
    background: '#d4844a',
    color: '#1a1612',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: '0.9rem',
    transition: 'all 0.2s ease',
  },
  visualSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    height: '70vh',
  },
  gifContainer: {
    background: '#252017',
    border: '1px solid #3a3025',
    borderRadius: '16px',
    overflow: 'hidden',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },
  lofiGif: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '16px',
  },
  audioControls: {
    background: '#252017',
    border: '1px solid #3a3025',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
  },
  audioInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nowPlaying: {
    fontSize: '0.9rem',
    color: '#c4a882',
    fontFamily: 'JetBrains Mono, monospace',
  },
  volumeBtn: {
    background: '#2d261b',
    border: '1px solid #3a3025',
    borderRadius: '8px',
    padding: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '50px',
    height: '50px',
    fontSize: '1.2rem',
  },
};

export default AIStreamerChat;
