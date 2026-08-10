import { useState, useEffect } from 'react'

const useAiAssistant = () => {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)

  const ask = async (query) => {
    // TODO: call AiService.query(query)
  }

  return { messages, loading, ask }
}

export default useAiAssistant
