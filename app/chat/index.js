import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Modal, Dimensions, Alert, Animated, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { colors, fontFamily, spacing, borderRadius, shadows } from '../../theme';
import { chatService } from '../../lib/chat/chatService';
import { supabase } from '../../lib/supabase/client';
import { FontAwesome } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.ivory,
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: colors.softGoldBorder,
    backgroundColor: colors.white,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.onyxBlack,
    fontFamily,
  },
  closeButton: {
    padding: spacing.lg,
  },
  closeButtonText: {
    fontSize: 28,
    color: colors.onyxBlack,
    fontFamily,
    fontWeight: 'bold',
  },
  errorContainer: {
    padding: spacing.lg,
    backgroundColor: colors.ruby,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderColor: colors.ruby,
    borderWidth: 1,
  },
  errorText: {
    color: colors.white,
    textAlign: 'center',
    fontFamily,
    fontSize: 16,
    lineHeight: 24,
  },
  messagesContainer: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.ivory,
  },
  messageContainer: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    maxWidth: '80%',
    overflow: 'hidden',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.gold,
    borderColor: colors.softGoldBorder,
    borderWidth: 1,
    ...shadows.card,
    padding: spacing.lg,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    padding: spacing.lg,
    maxWidth: '80%',
    ...shadows.card,
  },
  messageText: {
    color: colors.onyxBlack,
    fontFamily,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.5,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.ivory,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderTopWidth: 2,
    borderTopColor: colors.softGoldBorder,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    marginRight: spacing.md,
    borderWidth: 2,
    borderColor: colors.softGoldBorder,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    fontSize: 16,
    fontFamily,
    backgroundColor: colors.white,
    color: colors.onyxBlack,
  },
  sendButton: {
    backgroundColor: colors.gold,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.card,
  },
  sendButtonText: {
    color: colors.white,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily,
    letterSpacing: 0.5,
  },
  messagesList: {
    paddingBottom: spacing.lg,
    backgroundColor: colors.ivory,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
    ...shadows.card,
  },
  typingText: {
    marginLeft: spacing.sm,
    color: colors.platinum,
    fontFamily,
    fontSize: 14,
  },
  timestamp: {
    fontSize: 12,
    color: colors.platinum,
    marginTop: spacing.xs,
    alignSelf: 'flex-end',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  productInfo: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    ...shadows.card,
  },
  productCard: {
    padding: spacing.sm,
    backgroundColor: colors.ivory,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.softGoldBorder,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.onyxBlack,
    marginBottom: spacing.xs,
  },
  productPrice: {
    fontSize: 12,
    color: colors.gold,
    marginBottom: spacing.xs,
  },
  productStock: {
    fontSize: 12,
    color: colors.platinum,
  },
});

const ChatScreen = ({ isChatVisible, setIsChatVisible }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [productInfo, setProductInfo] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const messageAnimations = useRef(new Map()).current;

  // Animation for chat visibility
  useEffect(() => {
    if (isChatVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isChatVisible]);

  // Animate new messages
  useEffect(() => {
    messages.forEach((msg, index) => {
      if (!messageAnimations.has(index)) {
        const anim = new Animated.Value(0);
        messageAnimations.set(index, anim);
        Animated.spring(anim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }).start();
      }
    });
  }, [messages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Initialize chat session and get session ID
  useEffect(() => {
    const initializeChat = async () => {
      try {
        const session = await chatService.getGuestSession(null);
        if (!session) {
          throw new Error('Failed to get session');
        }
        setSessionId(session.session_id);
        setIsInitialized(true);
        // Load initial messages
        await loadMessages();
      } catch (error) {
        console.error('Error initializing chat:', error);
        setError('Failed to initialize chat session');
      }
    };
    initializeChat();
  }, []);

  // Load messages from chat history
  const loadMessages = async () => {
    try {
      const { data, error: loadError } = await supabase
        .from('chat_history')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      
      if (loadError) {
        console.error('Error loading messages:', loadError);
        setError('Failed to load chat history');
        return;
      }

      if (data) {
        const formattedMessages = data.map(msg => ({
          text: msg.message || msg.response,
          sender: msg.message ? 'user' : 'assistant',
          timestamp: msg.created_at,
          productInfo: msg.product_info ? JSON.parse(msg.product_info) : null
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setError('Failed to load chat history');
    }
  };

  // Handle sending messages with improved error handling and animations
  const handleSend = async () => {
    if (!message.trim()) return;

    try {
      setIsLoading(true);
      setError(null);

      // Add user message immediately
      const userMessage = {
        text: message,
        sender: 'user',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
      setMessage('');

      // Show typing indicator
      setIsTyping(true);

      // Get product information
      const productInfo = await chatService.getRelevantProductInfo(message);
      
      // Generate response
      const response = await chatService.generateResponse(message, messages, productInfo);
      
      // Add assistant response
      const assistantMessage = {
        text: response,
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        productInfo: productInfo
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Store messages in database
      await chatService.storeMessage(message, null, response, sessionId);

      // Track analytics
      await trackChatAnalytics(message, response, productInfo, sessionId);
    } catch (error) {
      handleErrorMessage(error);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  // Render message with animations and product info
  const renderMessage = (message, index) => {
    const isUser = message.sender === 'user';
    const messageAnim = messageAnimations.get(index) || new Animated.Value(1);

    const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });

    return (
      <Animated.View
        key={index}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessage : styles.assistantMessage,
          {
            opacity: messageAnim,
            transform: [
              {
                translateY: messageAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.messageText}>{message.text}</Text>
        {message.productInfo?.length > 0 && !isUser && (
          <View style={styles.productInfo}>
            {message.productInfo.map((product, idx) => (
              <View key={idx} style={styles.productCard}>
                <Text style={styles.productTitle}>{product.title}</Text>
                <Text style={styles.productPrice}>${product.price.toFixed(2)}</Text>
                <Text style={styles.productStock}>
                  {product.inStock ? 'In Stock' : 'Out of Stock'}
                </Text>
              </View>
            ))}
          </View>
        )}
        <Text style={styles.timestamp}>{timestamp}</Text>
      </Animated.View>
    );
  };

  // Handle error messages
  const handleErrorMessage = (error) => {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('product not found')) {
      setError('I couldn\'t find that product. Would you like me to suggest some alternatives?');
    } else if (errorMessage.includes('stock') || errorMessage.includes('inventory')) {
      setError('I apologize, but that product is currently out of stock. Would you like to know about similar items?');
    } else if (errorMessage.includes('price')) {
      setError('I apologize, but I couldn\'t retrieve the price information. Would you like to see similar products?');
    } else if (errorMessage.includes('no response received')) {
      setError('I apologize, but I didn\'t understand your question. Could you please rephrase it?');
    } else {
      setError('I apologize, but I encountered an issue. Could you please try rephrasing your question?');
    }
  };

  // Track chat analytics
  const trackChatAnalytics = async (query, response, productInfo, sessionId) => {
    try {
      await supabase.from('chat_analytics').insert({
        id: uuidv4(),
        session_id: sessionId,
        query,
        response,
        product_info: JSON.stringify(productInfo),
        intent: productInfo?.[0]?.intent || 'UNKNOWN',
        entities: JSON.stringify(productInfo?.[0]?.entities || {}),
        created_at: new Date(),
        updated_at: new Date()
      });
    } catch (error) {
      console.error('Error tracking chat analytics:', error);
    }
  };

  // Handle keyboard submit
  const handleSubmit = () => {
    if (message.trim() && !isLoading) {
      handleSend();
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          display: isChatVisible ? 'flex' : 'none',
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat Support</Text>
        <Pressable
          style={styles.closeButton}
          onPress={() => setIsChatVisible(false)}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </Pressable>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.messagesContainer}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.messagesList}
        >
          {messages.map((msg, index) => renderMessage(msg, index))}
          {isTyping && (
            <View style={styles.typingIndicator}>
              <ActivityIndicator size="small" color={colors.gold} />
              <Text style={styles.typingText}>Assistant is typing...</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="Type your message..."
          placeholderTextColor={colors.platinum}
          multiline
          maxLength={500}
          onSubmitEditing={handleSubmit}
          blurOnSubmit={false}
          returnKeyType="send"
          enablesReturnKeyAutomatically={true}
        />
        <Pressable
          style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!message.trim() || isLoading}
        >
          <FontAwesome
            name="send"
            size={20}
            color={message.trim() ? colors.white : colors.platinum}
          />
        </Pressable>
      </View>
    </Animated.View>
  );
};

export default ChatScreen;
