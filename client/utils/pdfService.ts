import { api } from './api';

export interface PdfProcessingResult {
  processing_id: string;
  text_length: number;
  status: 'completed' | 'failed' | 'pending';
  message?: string;
}

export interface QuestionResponse {
  processing_id: string;
  question: string;
  answer: string;
  timestamp: string;
}

export interface Conversation {
  question: string;
  answer: string;
  timestamp: string;
}

export interface ConversationHistory {
  processing_id: string;
  conversations: Conversation[];
  total_conversations: number;
}

class PdfService {
  /**
   * Process a PDF file for question answering
   * @param fileId - The ID of the uploaded file
   * @param signedUrl - The signed URL or S3 key for the PDF file
   */
  async processPdf(fileId: string, signedUrl: string): Promise<PdfProcessingResult> {
    const response = await api.post('/pdf-processor', {
      action: 'process_pdf',
      file_id: fileId,
      signed_url: signedUrl,
    });
    return response.data;
  }

  /**
   * Ask a question about a processed PDF
   * @param processingId - The processing session ID
   * @param question - The question to ask about the PDF
   */
  async askQuestion(processingId: string, question: string): Promise<QuestionResponse> {
    const response = await api.post('/pdf-processor', {
      action: 'ask_question',
      processing_id: processingId,
      question: question,
    });
    return response.data;
  }

  /**
   * Get conversation history for a processing session
   * @param processingId - The processing session ID
   */
  async getConversations(processingId: string): Promise<ConversationHistory> {
    const response = await api.post('/pdf-processor', {
      action: 'get_conversations',
      processing_id: processingId,
    });
    return response.data;
  }

  /**
   * Process PDF and return processing ID for subsequent questions
   * This is a convenience method that handles the full flow
   */
  async initializePdfChat(fileId: string, signedUrl: string): Promise<string> {
    const response = await this.processPdf(fileId, signedUrl);
    
    if (response.status !== 'completed') {
      throw new Error(
        `PDF processing failed: ${response.message || 'Unknown error'}`
      );
    }
    
    return response.processing_id;
  }

  /**
   * Send a message and get response (combines ask question and get updated history)
   */
  async sendMessage(processingId: string, question: string): Promise<QuestionResponse> {
    return await this.askQuestion(processingId, question);
  }
}

export const pdfService = new PdfService();
export default pdfService; 