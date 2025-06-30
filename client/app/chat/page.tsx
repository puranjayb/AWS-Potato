'use client'
import React, { useState, useEffect, ReactNode, JSX } from 'react'
import { 
  Heart, 
  LogOut, 
  Send,
  FileText,
  Bot,
  User,
  Download,
  Trash2,
  RefreshCw,
  AlertCircle,
  MessageSquare,
  Copy} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useLogout } from '@/hooks/useAuth'
import { useRouter, useSearchParams } from 'next/navigation'
import usePdfChat from '@/hooks/usePdfChat'
import { toast } from '@/utils/toast'

interface FloatingElementProps {
  delay: number
  children: ReactNode
  className?: string
}

interface MousePosition {
  x: number
  y: number
}

interface ChatMessage {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  isLoading?: boolean
}

export default function PdfChatPage(): JSX.Element {
  const { isAuthenticated } = useAuthStore()
  const logout = useLogout()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get file info from URL params
  const fileId = searchParams.get('fileId') || ''
  const fileName = searchParams.get('fileName') || 'Unknown File'
  
  const [isVisible, setIsVisible] = useState<boolean>(false)
  const [mousePosition, setMousePosition] = useState<MousePosition>({ x: 0, y: 0 })
  const [inputMessage, setInputMessage] = useState<string>('')

  // Use the PDF chat hook
  const {
    session,
    isTyping,
    isInitializing,
    messagesEndRef,
    sendQuestion,
    initializeProcessing,
    clearConversation,
    exportConversation,
    canSendMessage,
    isReady,
    hasError,
    messageCount,
    conversationCount
  } = usePdfChat({ 
    fileId, 
    fileName, 
    autoInitialize: true 
  })

  useEffect((): (() => void) => {
    if (!isAuthenticated) {
      router.push('/login')
      return () => {}
    }

    if (!fileId) {
      router.push('/reports')
      return () => {}
    }

    setIsVisible(true)
    
    const handleMouseMove = (e: MouseEvent): void => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return (): void => window.removeEventListener('mousemove', handleMouseMove)
  }, [isAuthenticated, router, fileId])

  const FloatingElement: React.FC<FloatingElementProps> = ({ 
    delay, 
    children, 
    className = "" 
  }) => (
    <div 
      className={`animate-float ${className}`}
      style={{ 
        animationDelay: `${delay}s`,
        animationDuration: '6s'
      }}
    >
      {children}
    </div>
  )

  const handleSendMessage = (): void => {
    if (!inputMessage.trim() || !canSendMessage) return
    
    sendQuestion(inputMessage)
    setInputMessage('')
  }

  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleCopyMessage = (content: string): void => {
    navigator.clipboard.writeText(content)
    toast.success('Message copied to clipboard!')
  }

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const getStatusColor = (): string => {
    switch (session.status) {
      case 'ready': return 'text-green-400'
      case 'processing': return 'text-yellow-400'
      case 'error': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusText = (): string => {
    switch (session.status) {
      case 'ready': return 'Ready for questions'
      case 'processing': return 'Processing document...'
      case 'error': return 'Processing failed'
      default: return 'Initializing...'
    }
  }

  const renderMessage = (message: ChatMessage): JSX.Element => {
    const isUser = message.type === 'user'
    const isSystem = message.type === 'system'
    
    return (
      <div 
        key={message.id} 
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 group animate-fadeIn`}
      >
        <div className={`flex items-start space-x-3 max-w-4xl ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
          {/* Avatar */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isUser 
              ? 'bg-gradient-to-r from-blue-500 to-purple-600' 
              : isSystem
              ? 'bg-gradient-to-r from-gray-500 to-gray-600'
              : 'bg-gradient-to-r from-green-500 to-emerald-600'
          } shadow-lg`}>
            {isUser ? (
              <User className="w-5 h-5 text-white" />
            ) : isSystem ? (
              <AlertCircle className="w-5 h-5 text-white" />
            ) : (
              <Bot className="w-5 h-5 text-white" />
            )}
          </div>
          
          {/* Message Content */}
          <div className={`relative p-4 rounded-2xl backdrop-blur-lg shadow-lg ${
            isUser 
              ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30' 
              : isSystem
              ? 'bg-gradient-to-r from-gray-500/20 to-gray-600/20 border border-gray-400/30'
              : 'bg-white/10 border border-white/20'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 rounded-2xl" />
            <div className="relative z-10">
              {message.isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                  <span className="text-white/70 text-sm">Thinking...</span>
                </div>
              ) : (
                <>
                  <p className="text-white leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-white/50">{formatTimestamp(message.timestamp)}</span>
                    {!isSystem && (
                      <button
                        onClick={() => handleCopyMessage(message.content)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded hover:bg-white/10"
                        type="button"
                      >
                        <Copy className="w-3 h-3 text-white/70 hover:text-white" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center relative overflow-hidden">
        <div className="text-center relative z-10">
          <div className="w-16 h-16 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70 text-lg">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden flex flex-col">

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse transition-all duration-1000"
          style={{
            left: `${mousePosition.x * 0.02}px`,
            top: `${mousePosition.y * 0.02}px`,
          }}
        />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-2000" />
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {([...Array(15)] as undefined[]).map((_: undefined, i: number) => (
          <FloatingElement key={i} delay={i * 0.3}>
            <div 
              className="absolute w-1 h-1 bg-white/20 rounded-full animate-twinkle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`
              }}
            />
          </FloatingElement>
        ))}
      </div>

      {/* Header */}
      <header className={`relative z-10 transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="backdrop-blur-lg bg-white/5 border-b border-white/10 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <button 
                  className="group flex items-center space-x-2 hover:scale-105 transition-transform duration-300 cursor-pointer"
                  onClick={() => router.push('/reports')}
                  type="button"
                >
                <div className="flex items-center space-x-4 group">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-blue-500/25">
                    <Heart className="w-6 h-6 text-white animate-pulse" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      HealthCare+
                    </h1>
                  </div>
                </div>
                </button>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="hidden sm:block text-right">
                  <p className="text-sm text-white font-medium">PDF Assistant</p>
                  <p className="text-xs text-white/70">Ask questions about your document</p>
                </div>
                <button
                  onClick={() => logout()}
                  className="group flex items-center space-x-2 px-4 py-2 rounded-lg backdrop-blur-sm bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all duration-300 hover:scale-105"
                  type="button"
                >
                  <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Chat Container */}
      <div className="flex-1 flex flex-col relative z-10 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* File Info Card */}
        <div className={`mb-6 transition-all duration-1000 delay-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="relative p-4 rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold truncate max-w-md">{fileName}</h3>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className={`${getStatusColor()}`}>{getStatusText()}</span>
                    {conversationCount > 0 && (
                      <span className="text-white/70">
                        {conversationCount} conversation{conversationCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {hasError && (
                  <button
                    onClick={initializeProcessing}
                    className="px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-105 text-sm font-medium"
                    type="button"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Retry
                  </button>
                )}
                
                {messageCount > 0 && (
                  <>
                    <button
                      onClick={exportConversation}
                      className="px-2 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-all duration-300 hover:scale-105 text-sm"
                      type="button"
                    >
                      <Download className="w-4 h-4 mr-1" />
                    </button>
                    
                    <button
                      onClick={clearConversation}
                      className="px-3 py-2 border border-red-400/30 text-red-300 rounded-lg hover:bg-red-400/20 transition-all duration-300 hover:scale-105 text-sm"
                      type="button"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className={`flex-1 relative transition-all duration-1000 delay-500 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="h-full relative p-6 rounded-2xl backdrop-blur-lg bg-white/5 border border-white/10 shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl" />
            
            <div className="relative z-10 h-full flex flex-col">
              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20">
                {session.messages.length === 0 && !isInitializing ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageSquare className="w-16 h-16 text-white/30 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-white/70 mb-2">Start a conversation</h3>
                      <p className="text-white/50">Ask questions about your document to get started.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {session.messages.map(renderMessage)}
                    {isTyping && (
                      <div className="flex justify-start mb-4">
                        <div className="flex items-start space-x-3 max-w-4xl">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                            <Bot className="w-5 h-5 text-white" />
                          </div>
                          <div className="relative p-4 rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20 shadow-lg">
                            <div className="flex items-center space-x-2">
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce delay-100"></div>
                                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce delay-200"></div>
                              </div>
                              <span className="text-white/70 text-sm">AI is thinking...</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className={`mt-6 transition-all duration-1000 delay-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="relative p-4 rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl" />
            <div className="relative z-10 flex items-end space-x-4">
              <div className="flex-1">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    isReady 
                      ? "Ask a question about your document..." 
                      : "Please wait for the document to be processed..."
                  }
                  disabled={!canSendMessage}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 hover:bg-white/10 transition-all duration-300 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                  rows={Math.min(inputMessage.split('\n').length, 4)}
                />
              </div>
              
              <button
                onClick={handleSendMessage}
                disabled={!canSendMessage || !inputMessage.trim()}
                className="group relative bg-gradient-to-r from-blue-500 to-purple-600 text-white p-3 rounded-lg hover:shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105 transform overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                type="button"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Send className="relative w-5 h-5" />
              </button>
            </div>
            
            {inputMessage.length > 0 && (
              <div className="mt-2 text-xs text-white/50">
                Press Enter to send, Shift+Enter for new line
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-6px) rotate(1deg); }
          66% { transform: translateY(3px) rotate(-1deg); }
        }
        
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-twinkle {
          animation: twinkle 3s ease-in-out infinite;
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        
        .scrollbar-thin {
          scrollbar-width: thin;
        }
        
        .scrollbar-track-transparent {
          scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
        }
        
        .scrollbar-thumb-white\/20::-webkit-scrollbar {
          width: 6px;
        }
        
        .scrollbar-thumb-white\/20::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .scrollbar-thumb-white\/20::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
      `}</style>
    </div>
  )
}