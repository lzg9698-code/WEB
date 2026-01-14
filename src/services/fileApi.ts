/**
 * 文件管理模块API服务
 * 
 * 严格遵循PROJECT_REQUIREMENTS.md文档约束
 * 功能：提供文件管理相关的API接口调用
 */

import type { FileItem, FileOperation, FileSearchResult } from '@/stores/fileManagerStore'

export class FileApiService {
  private baseUrl = '/api/files'

  /**
   * 获取文件列表
   */
  async getFileList(path: string = '/'): Promise<{
    files: FileItem[]
    total: number
    parentPath?: string
  }> {
    const response = await fetch(`${this.baseUrl}?path=${encodeURIComponent(path)}`)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 获取文件内容
   */
  async getFileContent(filePath: string): Promise<{
    content: string
    encoding: string
    size: number
    lastModified: string
  }> {
    const response = await fetch(`${this.baseUrl}/content?path=${encodeURIComponent(filePath)}`)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 创建文件或文件夹
   */
  async createFile(path: string, name: string, type: 'file' | 'directory'): Promise<{
    file: FileItem
    created: boolean
  }> {
    const response = await fetch(`${this.baseUrl}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, name, type })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 删除文件或文件夹
   */
  async deleteFile(path: string): Promise<{
    deleted: boolean
    message?: string
  }> {
    const response = await fetch(`${this.baseUrl}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 重命名文件或文件夹
   */
  async renameFile(oldPath: string, newName: string): Promise<{
    file: FileItem
    renamed: boolean
  }> {
    const response = await fetch(`${this.baseUrl}/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPath, newName })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 复制文件或文件夹
   */
  async copyFile(sourcePath: string, targetPath: string): Promise<{
    file: FileItem
    copied: boolean
  }> {
    const response = await fetch(`${this.baseUrl}/copy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourcePath, targetPath })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 移动文件或文件夹
   */
  async moveFile(sourcePath: string, targetPath: string): Promise<{
    file: FileItem
    moved: boolean
  }> {
    const response = await fetch(`${this.baseUrl}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourcePath, targetPath })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 批量操作文件
   */
  async batchOperation(
    operation: 'copy' | 'move' | 'delete',
    files: string[],
    targetPath?: string
  ): Promise<{
    results: Array<{
      file: string
      success: boolean
      error?: string
    }>
    summary: {
      total: number
      successful: number
      failed: number
    }
  }> {
    const response = await fetch(`${this.baseUrl}/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation, files, targetPath })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 上传文件
   */
  async uploadFiles(
    files: File[],
    targetPath: string,
    onProgress?: (progress: number, fileName: string) => void
  ): Promise<{
    uploaded: string[]
    failed: Array<{ file: string; error: string }>
    summary: {
      total: number
      uploaded: number
      failed: number
      totalSize: number
    }
  }> {
    const formData = new FormData()
    formData.append('path', targetPath)
    
    files.forEach(file => {
      formData.append('files', file)
    })

    const xhr = new XMLHttpRequest()
    
    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100)
          onProgress(progress, files[0].name) // 简化处理，只显示第一个文件的进度
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText)
            resolve(result)
          } catch (error) {
            reject(new Error('响应解析失败'))
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText)
            reject(new Error(errorData.message || `HTTP ${xhr.status}`))
          } catch {
            reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`))
          }
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('上传失败'))
      })

      xhr.open('POST', `${this.baseUrl}/upload`)
      xhr.send(formData)
    })
  }

  /**
   * 下载文件
   */
  async downloadFile(filePath: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/download?path=${encodeURIComponent(filePath)}`)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.blob()
  }

  /**
   * 搜索文件
   */
  async searchFiles(options: {
    query: string
    path?: string
    scope?: 'current' | 'subfolders' | 'project'
    fileType?: string
    extensions?: string[]
    mode?: 'plain' | 'regex' | 'case-sensitive' | 'whole-word'
    includeContent?: boolean
    excludeHidden?: boolean
    excludeBinary?: boolean
    maxResults?: number
  }): Promise<{
    results: FileSearchResult[]
    stats: {
      filesSearched: number
      matchedFiles: number
      totalMatches: number
      duration: number
    }
  }> {
    const response = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(filePath: string): Promise<{
    file: FileItem
    metadata: {
      encoding: string
      lineCount?: number
      wordCount?: number
      charCount?: number
      checksum: string
      permissions: string
      owner?: string
      group?: string
    }
  }> {
    const response = await fetch(`${this.baseUrl}/info?path=${encodeURIComponent(filePath)}`)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 获取文件统计信息
   */
  async getFileStats(path?: string): Promise<{
    totalFiles: number
    totalDirectories: number
    totalSize: number
    largestFile: FileItem
    mostRecent: FileItem
    fileTypes: Array<{
      extension: string
      count: number
      size: number
    }>
  }> {
    const url = path ? `${this.baseUrl}/stats?path=${encodeURIComponent(path)}` : `${this.baseUrl}/stats`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 获取磁盘使用情况
   */
  async getDiskUsage(path?: string): Promise<{
    path: string
    total: number
    used: number
    available: number
    usage: number
  }> {
    const url = path ? `${this.baseUrl}/disk-usage?path=${encodeURIComponent(path)}` : `${this.baseUrl}/disk-usage`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 在文件管理器中显示文件
   */
  async showInExplorer(filePath: string): Promise<{
    shown: boolean
    message?: string
  }> {
    const response = await fetch(`${this.baseUrl}/show-in-explorer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 获取文件模板列表
   */
  async getFileTemplates(): Promise<Array<{
    id: string
    name: string
    description: string
    content: string
    extension: string
    category: string
  }>> {
    const response = await fetch(`${this.baseUrl}/templates`)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 从模板创建文件
   */
  async createFileFromTemplate(
    templateId: string,
    fileName: string,
    targetPath: string,
    variables?: Record<string, any>
  ): Promise<{
    file: FileItem
    created: boolean
  }> {
    const response = await fetch(`${this.baseUrl}/create-from-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId,
        fileName,
        targetPath,
        variables
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 压缩文件或文件夹
   */
  async compressFiles(
    files: string[],
    archivePath: string,
    format: 'zip' | 'tar' | 'tar-gz' = 'zip'
  ): Promise<{
    archive: FileItem
    compressed: boolean
  }> {
    const response = await fetch(`${this.baseUrl}/compress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files,
        archivePath,
        format
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 解压缩文件
   */
  async extractArchive(
    archivePath: string,
    targetPath: string
  ): Promise<{
    extracted: string[]
    count: number
  }> {
    const response = await fetch(`${this.baseUrl}/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        archivePath,
        targetPath
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 比较文件内容
   */
  async compareFiles(
    filePath1: string,
    filePath2: string
  ): Promise<{
    identical: boolean
    differences: Array<{
      line1: number
      line2: number
      content1: string
      content2: string
      type: 'addition' | 'deletion' | 'modification'
    }>
    summary: {
      additions: number
      deletions: number
      modifications: number
    }
  }> {
    const response = await fetch(`${this.baseUrl}/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filePath1,
        filePath2
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }
}

// 创建单例实例
export const fileApi = new FileApiService()

// 导出类型
export type { FileItem, FileOperation, FileSearchResult }