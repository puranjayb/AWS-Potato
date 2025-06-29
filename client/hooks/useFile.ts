// lib/useFile.ts
import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fileService, fileUtils, FileMetadata } from '../utils/fileService'
import { useAuthStore } from '@/store/authStore'

// Re-export validation function for convenience
export const validateFile = fileUtils.validateFile

// React Query keys
const QUERY_KEYS = {
  files: (projectId?: string) => ['files', projectId] as const,
  file: (fileId: string) => ['file', fileId] as const,
} as const

/**
 * Hook to fetch and manage files list
 */
export const useFiles = (authToken: string, projectId?: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.files(projectId),
    queryFn: () => fileService.listFiles(authToken),
    staleTime: 30000, // 30 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

/**
 * Hook to fetch individual file metadata
 */
export const useFile = (authToken: string, fileId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.file(fileId),
    queryFn: () => fileService.getFileMetadata(authToken, fileId),
    enabled: !!fileId,
    staleTime: 60000, // 1 minute
  })
}

/**
 * Hook for file operations (upload, download, delete)
 */
export const useFileOperations = () => {
  const queryClient = useQueryClient()
  const { token: authToken } = useAuthStore();

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ 
      file, 
      projectId, 
      onProgress 
    }: {
      file: File
      projectId?: string
      onProgress?: (progress: number) => void
    }) => {
      return fileUtils.uploadFile(authToken!, file, projectId, onProgress)
    },
    onSuccess: (data, variables) => {
      // Invalidate files list to refresh the UI
      queryClient.invalidateQueries({ 
        queryKey: ['files'] 
      })
      
      // Add the new file to the cache
      queryClient.setQueryData(
        QUERY_KEYS.file(data.file_id),
        data
      )
      
      // Update the files list cache if we can
      const projectId = variables.projectId
      queryClient.setQueryData(
        QUERY_KEYS.files(projectId),
        (oldData: FileMetadata[] | undefined) => {
          if (!oldData) return [data]
          return [data, ...oldData]
        }
      )
    },
    onError: (error) => {
      console.error('Upload failed:', error)
    }
  })

  // Download mutation
  const downloadMutation = useMutation({
    mutationFn: async ({ 
      fileId, 
      filename 
    }: { 
      fileId: string
      filename: string 
    }) => {
      return fileUtils.downloadFile(authToken!, fileId, filename)
    },
    onError: (error) => {
      console.error('Download failed:', error)
    }
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (fileId: string) => fileService.deleteFile(authToken!, fileId),
    onSuccess: (_, fileId) => {
      // Remove from all files lists
      queryClient.invalidateQueries({ 
        queryKey: ['files'] 
      })
      
      // Remove individual file from cache
      queryClient.removeQueries({
        queryKey: QUERY_KEYS.file(fileId)
      })
    },
    onError: (error) => {
      console.error('Delete failed:', error)
    }
  })

  // Generate download URL (for previews or custom handling)
  const generateDownloadUrlMutation = useMutation({
    mutationFn: (fileId: string) => fileService.generateDownloadUrl(authToken!, fileId),
    onError: (error) => {
      console.error('Generate download URL failed:', error)
    }
  })

  return {
    upload: uploadMutation,
    download: downloadMutation,
    delete: deleteMutation,
    generateDownloadUrl: generateDownloadUrlMutation,
  }
}

/**
 * Hook for bulk file operations
 */
export const useBulkFileOperations = () => {
  const queryClient = useQueryClient()
  const { token: authToken } = useAuthStore();

  if (!authToken) {
    throw new Error('Authentication token is required for bulk file operations')
  }

  // Bulk upload
  const bulkUploadMutation = useMutation({
    mutationFn: async ({
      files,
      projectId,
      onProgress,
      onFileComplete
    }: {
      files: File[]
      projectId?: string
      onProgress?: (fileIndex: number, progress: number) => void
      onFileComplete?: (fileIndex: number, result: FileMetadata) => void
    }) => {
      const results: (FileMetadata | Error)[] = []
      
      for (let i = 0; i < files.length; i++) {
        try {
          const result = await fileUtils.uploadFile(
            authToken,
            files[i],
            projectId,
            (progress: number) => onProgress?.(i, progress)
          )
          results.push(result)
          onFileComplete?.(i, result)
        } catch (error) {
          results.push(error as Error)
        }
      }
      
      return results
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
    }
  })

  // Bulk delete
  const bulkDeleteMutation = useMutation({
    mutationFn: async (fileIds: string[]) => {
      const results = await Promise.allSettled(
        fileIds.map(id => fileService.deleteFile(authToken, id))
      )
      return results
    },
    onSuccess: (_, fileIds) => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      
      // Remove individual files from cache
      fileIds.forEach(fileId => {
        queryClient.removeQueries({
          queryKey: QUERY_KEYS.file(fileId)
        })
      })
    }
  })

  return {
    bulkUpload: bulkUploadMutation,
    bulkDelete: bulkDeleteMutation,
  }
}

/**
 * Hook for file filtering and search
 */
export const useFileFilters = (files: FileMetadata[] = []) => {
  const filterFiles = (
    searchTerm: string = '',
    contentTypeFilter: string = 'all',
    projectFilter: string = 'all',
    statusFilter: 'all' | 'uploaded' | 'pending' | 'failed' = 'all'
  ) => {
    return files.filter(file => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        file.original_filename.toLowerCase().includes(searchTerm.toLowerCase())
      
      // Content type filter
      const matchesContentType = contentTypeFilter === 'all' || 
        file.content_type.includes(contentTypeFilter)
      
      // Project filter
      const matchesProject = projectFilter === 'all' || 
        file.project_id === projectFilter
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || 
        file.upload_status === statusFilter
      
      return matchesSearch && matchesContentType && matchesProject && matchesStatus
    })
  }

  const getFileStats = (filteredFiles: FileMetadata[]) => {
    return {
      totalCount: filteredFiles.length,
      totalSize: filteredFiles.reduce((sum, file) => sum + file.file_size, 0),
      uploadedCount: filteredFiles.filter(f => f.upload_status === 'uploaded').length,
      pendingCount: filteredFiles.filter(f => f.upload_status === 'pending').length,
      failedCount: filteredFiles.filter(f => f.upload_status === 'failed').length,
      byContentType: filteredFiles.reduce((acc, file) => {
        const type = fileUtils.getFileType(file.content_type)
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      byProject: filteredFiles.reduce((acc, file) => {
        const project = file.project_id || 'uncategorized'
        acc[project] = (acc[project] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }
  }

  return {
    filterFiles,
    getFileStats,
  }
}

/**
 * Hook for file preview functionality
 */
export const useFilePreview = () => {
  const { generateDownloadUrl } = useFileOperations()

  const previewFile = async (file: FileMetadata) => {
    if (!fileUtils.canPreview(file.content_type)) {
      throw new Error('File type not supported for preview')
    }

    try {
      const downloadUrlResponse = await generateDownloadUrl.mutateAsync(file.file_id)
      
      if (fileUtils.isImage(file.content_type) || fileUtils.isPDF(file.content_type)) {
        // Open in new tab for images and PDFs
        window.open(downloadUrlResponse.download_url, '_blank')
      } else {
        // For other supported types, trigger download
        const link = document.createElement('a')
        link.href = downloadUrlResponse.download_url
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error('Preview failed:', error)
      throw error
    }
  }

  return {
    previewFile,
    canPreview: fileUtils.canPreview,
    isLoading: generateDownloadUrl.isPending,
  }
}

/**
 * Hook for file sharing (if your API supports sharing)
 */
export const useFileSharing = () => {
  const { token } = useAuthStore();
  
  if (!token) {
    throw new Error('Authentication token is required for file sharing')
  }

  const generateShareUrl = async (fileId: string, expirationHours: number = 24) => {
    try {
      const downloadUrlResponse = await fileService.generateDownloadUrl(
        token,
        fileId, 
        expirationHours * 3600 // Convert hours to seconds
      )
      
      return {
        shareUrl: downloadUrlResponse.download_url,
        expiresIn: downloadUrlResponse.expires_in,
        fileId: downloadUrlResponse.file_id
      }
    } catch (error) {
      console.error('Share URL generation failed:', error)
      throw error
    }
  }

  return {
    generateShareUrl,
  }
}

/**
 * Custom hook for managing upload queue
 */
export const useUploadQueue = () => {
  const [uploadQueue, setUploadQueue] = React.useState<Array<{
    id: string
    file: File
    progress: number
    status: 'queued' | 'uploading' | 'completed' | 'error'
    error?: string
    result?: FileMetadata
  }>>([])

  const addToQueue = (files: File[]) => {
    const newItems = files.map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      progress: 0,
      status: 'queued' as const
    }))
    setUploadQueue(prev => [...prev, ...newItems])
    return newItems
  }

  const updateQueueItem = (id: string, updates: Partial<typeof uploadQueue[0]>) => {
    setUploadQueue(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ))
  }

  const removeFromQueue = (id: string) => {
    setUploadQueue(prev => prev.filter(item => item.id !== id))
  }

  const clearCompleted = () => {
    setUploadQueue(prev => prev.filter(item => 
      item.status !== 'completed' && item.status !== 'error'
    ))
  }

  const clearAll = () => {
    setUploadQueue([])
  }

  return {
    uploadQueue,
    addToQueue,
    updateQueueItem,
    removeFromQueue,
    clearCompleted,
    clearAll,
  }
}

// Export additional utilities
export { fileUtils, fileService }
export type { FileMetadata } from '../utils/fileService'