import { useState, useEffect, useRef } from 'react'
import { Loader, EmptyState, Card, Button } from '../../../../components/common'
import aiAssistantService from '../services/aiAssistant.service'
import toast from 'react-hot-toast'

const Chatbot = () => {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [capabilities, setCapabilities] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [conversationId, setConversationId] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    fetchCapabilities()
    setConversationId(Math.random().toString(36).substr(2, 9))
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchCapabilities = async () => {
    try {
      const response = await aiAssistantService.getChatbotCapabilities()
      setCapabilities(response)
    } catch (error) {
      console.error('Failed to fetch capabilities:', error)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!inputMessage.trim()) return

    const userMessage = inputMessage
    setInputMessage('')
    setMessages((prev) => [...prev, { type: 'user', text: userMessage }])

    try {
      setLoading(true)
      const response = await aiAssistantService.sendChatMessage({
        message: userMessage,
        conversation_id: conversationId,
      })

      setMessages((prev) => [
        ...prev,
        {
          type: 'assistant',
          text: response.response,
          escalated: response.escalated,
        },
      ])

      if (response.escalated) {
        toast.success('Your concern has been escalated to the support team')
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send message')
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  const handleQuickQuestion = (intent) => {
    const questionMap = {
      ORDER_STATUS: 'What is the status of my recent orders?',
      ORDER_DETAILS: 'Show me order details',
      PRODUCT_AVAILABILITY: 'Is this product available in stock?',
      PRODUCT_DETAILS: 'Tell me about product details',
      CUSTOMER_ORDER_HISTORY: 'Show customer order history',
      HUMAN_ESCALATION: 'I need to speak with someone',
    }
    setInputMessage(questionMap[intent] || '')
  }

  return (
    <div className="chatbot-container">
      <div className="chatbot-wrapper">
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-welcome">
              <h3>👋 Welcome to Support Chatbot</h3>
              <p>Ask me about orders, products, availability, and more</p>
              <div className="quick-actions">
                {capabilities.map((cap) => (
                  <Button
                    key={cap.intent}
                    onClick={() => handleQuickQuestion(cap.intent)}
                    className="btn-outline"
                  >
                    {cap.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`message message-${msg.type}`}>
              <div className="message-content">
                <p>{msg.text}</p>
                {msg.escalated && (
                  <span className="escalated-badge">🚀 Escalated to support</span>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="message message-assistant">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="chat-input-form">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask me anything..."
            disabled={loading}
            className="chat-input"
          />
          <Button type="submit" disabled={loading || !inputMessage.trim()}>
            {loading ? '...' : 'Send'}
          </Button>
        </form>
      </div>

      <div className="chatbot-sidebar">
        <Card>
          <h4>Quick Tips</h4>
          <ul className="tips-list">
            <li>✓ Ask about order status</li>
            <li>✓ Check product availability</li>
            <li>✓ Get order details</li>
            <li>✓ Request human support</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}

export default Chatbot
