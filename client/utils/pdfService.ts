// lib/pdfService.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-api-gateway-url.execute-api.us-west-2.amazonaws.com/prod'

// Helper function to get auth token
const getAuthToken = (): string => {
  const token = localStorage.getItem('auth-storage')
  if (token) {
    try {
      const parsedData = JSON.parse(token)
      return parsedData.state?.token || ''
    } catch (error) {
      console.error('Error parsing auth token:', error)
    }
  }
  return ''
}

export interface PdfProcessingResult {
  processing_id: string
  text_length: number
  status: 'completed' | 'failed' | 'pending'
  message?: string
}

export interface QuestionResponse {
  processing_id: string
  question: string
  answer: string
  timestamp: string
}

export interface Conversation {
  question: string
  answer: string
  timestamp: string
}

export interface ConversationHistory {
  processing_id: string
  conversations: Conversation[]
  total_conversations: number
}

class PdfService {
  /**
   * Process a PDF file for question answering
   * @param fileId - The ID of the uploaded file
   * @param signedUrl - The signed URL or S3 key for the PDF file
   */
  async processPdf(fileId: string, signedUrl: string): Promise<PdfProcessingResult> {
    const authToken = getAuthToken()

    const response = await fetch(`${API_BASE_URL}/pdf-processor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        action: 'process_pdf',
        file_id: fileId,
        signed_url: signedUrl,
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`PDF processing failed: ${response.status} ${response.statusText} - ${errorData}`)
    }

    const data = await response.json()
    return data
  }

  /**
   * Ask a question about a processed PDF
   * @param processingId - The processing session ID
   * @param question - The question to ask about the PDF
   */
  async askQuestion(processingId: string, question: string): Promise<QuestionResponse> {
    const authToken = getAuthToken()

    const response = await fetch(`${API_BASE_URL}/pdf-processor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        action: 'ask_question',
        processing_id: processingId,
        question: question,
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Question failed: ${response.status} ${response.statusText} - ${errorData}`)
    }

    const data = await response.json()
    return data
  }

  /**
   * Get conversation history for a processing session
   * @param processingId - The processing session ID
   */
  async getConversations(processingId: string): Promise<ConversationHistory> {
    const authToken = getAuthToken()

    const response = await fetch(`${API_BASE_URL}/pdf-processor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        action: 'get_conversations',
        processing_id: processingId,
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Get conversations failed: ${response.status} ${response.statusText} - ${errorData}`)
    }

    const data = await response.json()
    return data
  }

  /**
   * Process PDF and return processing ID for subsequent questions
   * This is a convenience method that handles the full flow
   */
  async initializePdfChat(fileId: string, signedUrl: string): Promise<string> {
    const response = await this.processPdf(fileId, signedUrl)
    
    if (response.status !== 'completed') {
      throw new Error(
        `PDF processing failed: ${response.message || 'Unknown error'}`
      )
    }
    
    return response.processing_id
  }

  /**
   * Send a message and get response (combines ask question and get updated history)
   */
  async sendMessage(processingId: string, question: string): Promise<QuestionResponse> {
    return await this.askQuestion(processingId, question)
  }

  /**
   * Check if a PDF processing session is still valid
   */
  async checkProcessingStatus(processingId: string): Promise<{ isValid: boolean; status?: string }> {
    try {
      const conversations = await this.getConversations(processingId)
      console.log('Processing status:', conversations)
      return { isValid: true, status: 'active' }
    } catch (error) {
      console.error('Error checking processing status:', error)
      return { isValid: false, status: 'expired' }
    }
  }

  /**
   * Get processing session summary
   */
  async getProcessingSummary(processingId: string): Promise<{
    processing_id: string
    total_conversations: number
    last_activity: string
    status: string
  }> {
    const conversations = await this.getConversations(processingId)
    
    const lastActivity = conversations.conversations.length > 0 
      ? conversations.conversations[conversations.conversations.length - 1].timestamp
      : new Date().toISOString()

    return {
      processing_id: processingId,
      total_conversations: conversations.total_conversations,
      last_activity: lastActivity,
      status: 'active'
    }
  }
}

export const pdfService = new PdfService()
export default pdfService