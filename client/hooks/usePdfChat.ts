// hooks/usePdfChat.ts
import { useState, useCallback, useRef, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from '@/utils/toast'
import { fileService } from './useFile'
import pdfService from '@/utils/pdfService'
import { useAuthStore } from '@/store/authStore'

export interface ChatMessage {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  isLoading?: boolean
}

export interface PdfChatSession {
  fileId: string
  fileName: string
  processingId?: string
  status: 'idle' | 'processing' | 'ready' | 'error'
  messages: ChatMessage[]
  error?: string
}

interface UsePdfChatOptions {
  fileId: string
  fileName: string
  autoInitialize?: boolean
}

// Helper function to generate unique IDs
const generateUniqueId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export const usePdfChat = ({ fileId, fileName, autoInitialize = true }: UsePdfChatOptions) => {
  const [session, setSession] = useState<PdfChatSession>({
    fileId,
    fileName,
    status: 'idle',
    messages: []
  })
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isTyping, setIsTyping] = useState(false)
  const initializationStartedRef = useRef(false) // Use ref instead of state to avoid re-renders

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [session.messages, scrollToBottom])

  const { token } = useAuthStore();

  // Initialize PDF processing
  const initializeMutation = useMutation({
    mutationFn: async () => {
      // Step 1: Get download URL for the file
      const downloadResponse = await fileService.generateDownloadUrl(token!, fileId)
      
      // Step 2: Process the PDF
      const processingResult = await pdfService.processPdf(fileId, downloadResponse.download_url)
      
      return { processingResult, downloadResponse }
    },
    onMutate: () => {
      // Only add system message if we don't already have a processing message
      setSession(prev => {
        const hasProcessingMessage = prev.messages.some(m => 
          m.type === 'system' && (m.content.includes('Processing') || m.content.includes('processed successfully'))
        )
        
        if (hasProcessingMessage) {
          return { ...prev, status: 'processing' }
        }
        
        return {
          ...prev,
          status: 'processing',
          messages: [
            ...prev.messages,
            {
              id: `system-processing-${generateUniqueId()}`,
              type: 'system',
              content: `Processing ${fileName}... Please wait.`,
              timestamp: new Date().toISOString()
            }
          ]
        }
      })
    },
    onSuccess: (data) => {
      const { processingResult } = data
      
      if (processingResult.status === 'completed') {
        setSession(prev => {
          // Remove any existing system messages about processing or success
          const filteredMessages = prev.messages.filter(m => 
            !(m.type === 'system' && (
              m.content.includes('Processing') || 
              m.content.includes('processed successfully')
            ))
          )
          
          return {
            ...prev,
            processingId: processingResult.processing_id,
            status: 'ready',
            messages: [
              ...filteredMessages,
              {
                id: `system-success-${generateUniqueId()}`,
                type: 'system',
                content: `✅ ${fileName} has been processed successfully! You can now ask questions about this document.`,
                timestamp: new Date().toISOString()
              }
            ]
          }
        })
        toast.success('PDF processed successfully! You can now ask questions.')
      } else {
        throw new Error(processingResult.message || 'PDF processing failed')
      }
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'PDF processing failed'
      initializationStartedRef.current = false // Reset on error
      setSession(prev => {
        // Remove any existing system messages about processing or success
        const filteredMessages = prev.messages.filter(m => 
          !(m.type === 'system' && (
            m.content.includes('Processing') || 
            m.content.includes('processed successfully')
          ))
        )
        
        return {
          ...prev,
          status: 'error',
          error: errorMessage,
          messages: [
            ...filteredMessages,
            {
              id: `system-error-${generateUniqueId()}`,
              type: 'system',
              content: `❌ Failed to process ${fileName}: ${errorMessage}`,
              timestamp: new Date().toISOString()
            }
          ]
        }
      })
      toast.error(`Failed to process PDF: ${errorMessage}`)
    }
  })

  // Send question mutation
  const questionMutation = useMutation({
    mutationFn: async (question: string) => {
      if (!session.processingId) {
        throw new Error('PDF not processed yet')
      }
      return await pdfService.askQuestion(session.processingId, question)
    },
    onMutate: (question) => {
      const userMessageId = `user-${generateUniqueId()}`
      const assistantMessageId = `assistant-${generateUniqueId()}`
      
      setSession(prev => ({
        ...prev,
        messages: [
          ...prev.messages,
          {
            id: userMessageId,
            type: 'user',
            content: question,
            timestamp: new Date().toISOString()
          },
          {
            id: assistantMessageId,
            type: 'assistant',
            content: '',
            timestamp: new Date().toISOString(),
            isLoading: true
          }
        ]
      }))
      
      setIsTyping(true)
      return { userMessageId, assistantMessageId }
    },
    onSuccess: (response, question, context) => {
      setSession(prev => ({
        ...prev,
        messages: prev.messages.map(msg => 
          msg.id === context?.assistantMessageId 
            ? {
                ...msg,
                content: response.answer,
                isLoading: false
              }
            : msg
        )
      }))
      setIsTyping(false)
    },
    onError: (error, question, context) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get response'
      
      setSession(prev => ({
        ...prev,
        messages: prev.messages.map(msg => 
          msg.id === context?.assistantMessageId 
            ? {
                ...msg,
                content: `❌ Error: ${errorMessage}`,
                isLoading: false
              }
            : msg
        )
      }))
      setIsTyping(false)
      toast.error(`Failed to get response: ${errorMessage}`)
    }
  })

  // Load conversation history
  const { data: conversationHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['pdf-conversations', session.processingId],
    queryFn: () => session.processingId ? pdfService.getConversations(session.processingId) : null,
    enabled: !!session.processingId && session.status === 'ready',
    staleTime: 30000 // 30 seconds
  })

  // Load existing conversations when history is fetched
  useEffect(() => {
    if (conversationHistory?.conversations && session.messages.length <= 2) { // Allow for up to 2 system messages
      const historyMessages: ChatMessage[] = []
      
      conversationHistory.conversations.forEach((conv, index) => {
        historyMessages.push({
          id: `history-user-${index}-${generateUniqueId()}`,
          type: 'user',
          content: conv.question,
          timestamp: conv.timestamp
        })
        historyMessages.push({
          id: `history-assistant-${index}-${generateUniqueId()}`,
          type: 'assistant', 
          content: conv.answer,
          timestamp: conv.timestamp
        })
      })
      
      if (historyMessages.length > 0) {
        setSession(prev => ({
          ...prev,
          messages: [
            ...prev.messages.filter(m => m.type === 'system'),
            ...historyMessages
          ]
        }))
      }
    }
  }, [conversationHistory, session.messages.length])

  // Auto-initialize if enabled - FIXED: Use ref and memoized function
  const performInitialization = useCallback(() => {
    if (!initializationStartedRef.current && !initializeMutation.isPending) {
      initializationStartedRef.current = true
      initializeMutation.mutate()
    }
  }, [initializeMutation])

  useEffect(() => {
    if (autoInitialize && session.status === 'idle') {
      performInitialization()
    }
  }, [autoInitialize, session.status, performInitialization])

  // Reset initialization flag when fileId changes
  useEffect(() => {
    initializationStartedRef.current = false
  }, [fileId])

  // Send a question
  const sendQuestion = useCallback((question: string) => {
    if (!question.trim()) return
    if (session.status !== 'ready') {
      toast.error('Please wait for the PDF to be processed first')
      return
    }
    if (questionMutation.isPending) {
      toast.error('Please wait for the current question to be answered')
      return
    }
    
    questionMutation.mutate(question.trim())
  }, [session.status, questionMutation])

  // Initialize processing manually
  const initializeProcessing = useCallback(() => {
    if ((session.status === 'idle' || session.status === 'error') && !initializeMutation.isPending) {
      initializationStartedRef.current = true
      initializeMutation.mutate()
    }
  }, [session.status, initializeMutation])

  // Clear conversation
  const clearConversation = useCallback(() => {
    setSession(prev => ({
      ...prev,
      messages: prev.messages.filter(m => m.type === 'system')
    }))
  }, [])

  // Retry last question
  const retryLastQuestion = useCallback(() => {
    const lastUserMessage = [...session.messages]
      .reverse()
      .find(m => m.type === 'user')
    
    if (lastUserMessage) {
      sendQuestion(lastUserMessage.content)
    }
  }, [session.messages, sendQuestion])

  // Export conversation
  const exportConversation = useCallback(() => {
    const conversationText = session.messages
      .filter(m => m.type !== 'system')
      .map(m => {
        const timestamp = new Date(m.timestamp).toLocaleString()
        const role = m.type === 'user' ? 'You' : 'Assistant'
        return `[${timestamp}] ${role}: ${m.content}`
      })
      .join('\n\n')
    
    const blob = new Blob([conversationText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileName}-conversation-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('Conversation exported successfully!')
  }, [session.messages, fileName])

  return {
    // State
    session,
    isTyping,
    isInitializing: initializeMutation.isPending,
    isLoadingHistory,
    messagesEndRef,
    
    // Actions
    sendQuestion,
    initializeProcessing,
    clearConversation,
    retryLastQuestion,
    exportConversation,
    
    // Status checks
    canSendMessage: session.status === 'ready' && !questionMutation.isPending,
    isProcessing: session.status === 'processing',
    isReady: session.status === 'ready',
    hasError: session.status === 'error',
    
    // Mutation states
    isSendingQuestion: questionMutation.isPending,
    questionError: questionMutation.error,
    
    // Stats
    messageCount: session.messages.filter(m => m.type !== 'system').length,
    conversationCount: Math.floor(session.messages.filter(m => m.type === 'user').length)
  }
}

export default usePdfChat