const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-api-gateway-url.execute-api.us-west-2.amazonaws.com/prod'

// Types for API responses
export interface UploadUrlResponse {
  upload_url: string
  file_id: string
  s3_key: string
  expires_in: number
  method: string
  instructions: string
}

export interface FileMetadata {
  file_id: string
  original_filename: string
  file_size: number
  content_type: string
  user_email: string
  upload_status: 'pending' | 'uploaded' | 'failed'
  processing_status: 'pending' | 'completed' | 'failed'
  created_at: string
  project_id?: string
}

export interface DownloadUrlResponse {
  download_url: string
  file_id: string
  filename: string
  expires_in: number
}

export interface FilesListResponse {
  files: FileMetadata[]
}

export interface ConfirmUploadResponse {
  message: string
  file_metadata: FileMetadata
}

// File service API implementation
export const fileService = {
  /**
   * Step 1: Generate presigned upload URL
   */
  generateUploadUrl: async (
    authToken: string,
    filename: string, 
    contentType: string, 
    projectId?: string,
    expiration: number = 3600,
  ): Promise<UploadUrlResponse> => {

    const response = await fetch(`${API_BASE_URL}/file-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        action: 'upload',
        filename,
        content_type: contentType,
        project_id: projectId,
        expiration
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Upload URL generation failed: ${response.status} ${response.statusText} - ${errorData}`)
    }

    return response.json()
  },

  /**
   * Step 2: Upload file directly to S3 using presigned URL
   */
  uploadToS3: async (
    uploadUrl: string, 
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      
      // Progress tracking
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = Math.round((e.loaded * 100) / e.total)
          onProgress(progress)
        }
      })

      // Success handler
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve()
        } else {
          reject(new Error(`S3 upload failed: ${xhr.status} ${xhr.statusText}`))
        }
      })

      // Error handler
      xhr.addEventListener('error', () => {
        reject(new Error('S3 upload failed: Network error'))
      })

      // Abort handler
      xhr.addEventListener('abort', () => {
        reject(new Error('S3 upload aborted'))
      })

      // Start upload
      xhr.open('PUT', uploadUrl)
      xhr.send(file)
    })
  },

  /**
   * Step 3: Confirm upload completion
   */
  confirmUpload: async (authToken: string, fileId: string, fileSize: number): Promise<FileMetadata> => {

    const response = await fetch(`${API_BASE_URL}/file-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        action: 'confirm',
        file_id: fileId,
        file_size: fileSize
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Upload confirmation failed: ${response.status} ${response.statusText} - ${errorData}`)
    }

    const data = await response.json()
    return data.file_metadata
  },

  /**
   * Get file metadata
   */
  getFileMetadata: async (authToken: string, fileId: string): Promise<FileMetadata> => {

    const response = await fetch(`${API_BASE_URL}/file-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        action: 'get',
        file_id: fileId
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Get file metadata failed: ${response.status} ${response.statusText} - ${errorData}`)
    }

    return response.json()
  },

  /**
   * List all files for the user
   */
  listFiles: async (authToken: string, projectId?: string): Promise<FileMetadata[]> => {

    const payload: { action: string; project_id?: string } = {
      action: 'list'
    }
    
    if (projectId && projectId !== 'all') {
      payload.project_id = projectId
    }

    const response = await fetch(`${API_BASE_URL}/file-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`File listing failed: ${response.status} ${response.statusText} - ${errorData}`)
    }

    const data = await response.json()
    return data.files || []
  },

  /**
   * Generate presigned download URL
   */
  generateDownloadUrl: async (
    authToken: string, 
    fileId: string, 
    expiration: number = 3600
  ): Promise<DownloadUrlResponse> => {

    const response = await fetch(`${API_BASE_URL}/file-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        action: 'download',
        file_id: fileId,
        expiration
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Download URL generation failed: ${response.status} ${response.statusText} - ${errorData}`)
    }

    return response.json()
  },

  /**
   * Delete file (if implemented in your API)
   */
  deleteFile: async (authToken: string, fileId: string): Promise<{ message: string }> => {

    const response = await fetch(`${API_BASE_URL}/file-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        action: 'delete', // Note: This might not be implemented in your current API
        file_id: fileId
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`File deletion failed: ${response.status} ${response.statusText} - ${errorData}`)
    }

    return response.json()
  }
}

// Utility functions for file handling
export const fileUtils = {
  /**
   * Complete file upload workflow
   */
  uploadFile: async (
    authToken: string, 
    file: File,
    projectId?: string,
    onProgress?: (progress: number) => void
  ): Promise<FileMetadata> => {
    try {
      // Step 1: Generate upload URL
      onProgress?.(10)
      const uploadResponse = await fileService.generateUploadUrl(
        authToken,
        file.name,
        file.type,
        projectId
      )

      // Step 2: Upload to S3
      await fileService.uploadToS3(
        uploadResponse.upload_url,
        file,
        (progress) => onProgress?.(10 + (progress * 0.8)) // 10% to 90%
      )

      // Step 3: Confirm upload
      onProgress?.(95)
      const confirmedFile = await fileService.confirmUpload(
        authToken,
        uploadResponse.file_id,
        file.size
      )

      onProgress?.(100)
      return confirmedFile
    } catch (error) {
      console.error('File upload failed:', error)
      throw error
    }
  },

  /**
   * Download file using presigned URL
   */
  downloadFile: async (authToken: string, fileId: string, filename: string): Promise<void> => {
    try {
      // Generate download URL
      const downloadResponse = await fileService.generateDownloadUrl(authToken, fileId)
      
      // Create temporary link and trigger download
      const link = document.createElement('a')
      link.href = downloadResponse.download_url
      link.download = filename
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('File download failed:', error)
      throw error
    }
  },

  /**
   * Format file size in human readable format
   */
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },

  /**
   * Get file type from content type
   */
  getFileType: (contentType: string): string => {
    if (contentType.includes('pdf')) return 'PDF'
    if (contentType.includes('image')) return 'Image'
    if (contentType.includes('video')) return 'Video'
    if (contentType.includes('audio')) return 'Audio'
    if (contentType.includes('text')) return 'Text'
    if (contentType.includes('spreadsheet') || contentType.includes('excel')) return 'Spreadsheet'
    if (contentType.includes('presentation') || contentType.includes('powerpoint')) return 'Presentation'
    if (contentType.includes('document') || contentType.includes('word')) return 'Document'
    return 'File'
  },

  /**
   * Validate file before upload
   */
  validateFile: (file: File, maxSizeInMB: number = 50): { isValid: boolean; error?: string } => {
    // Check file size
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024
    if (file.size > maxSizeInBytes) {
      return {
        isValid: false,
        error: `File size must be less than ${maxSizeInMB}MB`
      }
    }

    // Check file type (add more as needed)
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv'
    ]

    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `File type ${file.type} is not supported`
      }
    }

    return { isValid: true }
  },

  /**
   * Get file extension from filename
   */
  getFileExtension: (filename: string): string => {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2)
  },

  /**
   * Check if file is an image
   */
  isImage: (contentType: string): boolean => {
    return contentType.startsWith('image/')
  },

  /**
   * Check if file is a video
   */
  isVideo: (contentType: string): boolean => {
    return contentType.startsWith('video/')
  },

  /**
   * Check if file is a PDF
   */
  isPDF: (contentType: string): boolean => {
    return contentType === 'application/pdf'
  },

  /**
   * Generate file preview URL for supported types
   */
  canPreview: (contentType: string): boolean => {
    return fileUtils.isImage(contentType) || 
           fileUtils.isPDF(contentType) || 
           contentType === 'text/plain'
  }
}

export default fileService