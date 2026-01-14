/**
 * 渲染模块API服务
 * 
 * 严格遵循PROJECT_REQUIREMENTS.md文档约束
 * 功能：提供模板渲染相关的API接口调用
 */

import type { 
  RenderResult, 
  RenderSettings, 
  RenderHistoryItem 
} from '@/stores/renderStore'

export class RenderApiService {
  private baseUrl = '/api'

  /**
   * 渲染模板包
   */
  async renderTemplate(
    templateName: string,
    parameters: Record<string, any>,
    settings?: Partial<RenderSettings>
  ): Promise<RenderResult> {
    const response = await fetch(`${this.baseUrl}/templates/${templateName}/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parameters,
        settings: settings
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 预览模板渲染
   */
  async previewTemplate(
    templateName: string,
    parameters: Record<string, any>,
    settings?: Partial<RenderSettings>
  ): Promise<RenderResult> {
    const requestData = {
      parameters,
      settings: { 
        ...settings, 
        renderMode: 'preview' 
      }
    }

    const response = await fetch(`${this.baseUrl}/preview/${templateName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 验证模板包
   */
  async validateTemplate(templateName: string): Promise<{
    valid: boolean
    errors?: string[]
    warnings?: string[]
  }> {
    const response = await fetch(`${this.baseUrl}/templates/${templateName}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 批量渲染模板
   */
  async batchRender(
    requests: Array<{
      templateName: string
      parameters: Record<string, any>
      settings?: Partial<RenderSettings>
    }>
  ): Promise<Array<RenderResult | { error: string; templateName: string }>> {
    const response = await fetch(`${this.baseUrl}/templates/batch-render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 获取模板渲染统计信息
   */
  async getRenderStats(templateName?: string): Promise<{
    total_renders: number
    successful_renders: number
    failed_renders: number
    average_render_time: number
    last_render_time?: string
    popular_parameters?: Record<string, any>
  }> {
    const url = templateName 
      ? `${this.baseUrl}/templates/${templateName}/stats`
      : `${this.baseUrl}/render-stats`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 获取渲染日志
   */
  async getRenderLogs(
    templateName?: string,
    options?: {
      limit?: number
      offset?: number
      level?: 'debug' | 'info' | 'warning' | 'error'
      start_time?: string
      end_time?: string
    }
  ): Promise<{
    logs: Array<{
      timestamp: string
      level: string
      template_name?: string
      message: string
      parameters?: Record<string, any>
      render_time?: number
    }>
    total: number
    has_more: boolean
  }> {
    const params = new URLSearchParams()
    
    if (options) {
      if (options.limit) params.append('limit', options.limit.toString())
      if (options.offset) params.append('offset', options.offset.toString())
      if (options.level) params.append('level', options.level)
      if (options.start_time) params.append('start_time', options.start_time)
      if (options.end_time) params.append('end_time', options.end_time)
    }

    const url = templateName
      ? `${this.baseUrl}/templates/${templateName}/logs?${params}`
      : `${this.baseUrl}/render-logs?${params}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 清理渲染缓存
   */
  async clearRenderCache(templateName?: string): Promise<{
    cleared: number
    message: string
  }> {
    const url = templateName
      ? `${this.baseUrl}/templates/${templateName}/clear-cache`
      : `${this.baseUrl}/clear-render-cache`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 导出渲染结果
   */
  async exportRenderResult(
    resultId: string,
    format: 'json' | 'zip' | 'tar' = 'json'
  ): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/render-results/${resultId}/export?format=${format}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.blob()
  }

  /**
   * 获取渲染历史（服务端）
   */
  async getRenderHistory(options?: {
    template_name?: string
    status?: 'success' | 'error' | 'warning'
    start_time?: string
    end_time?: string
    limit?: number
    offset?: number
  }): Promise<{
    items: RenderHistoryItem[]
    total: number
    has_more: boolean
  }> {
    const params = new URLSearchParams()
    
    if (options) {
      if (options.template_name) params.append('template_name', options.template_name)
      if (options.status) params.append('status', options.status)
      if (options.start_time) params.append('start_time', options.start_time)
      if (options.end_time) params.append('end_time', options.end_time)
      if (options.limit) params.append('limit', options.limit.toString())
      if (options.offset) params.append('offset', options.offset.toString())
    }

    const response = await fetch(`${this.baseUrl}/render-history?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 比较渲染结果
   */
  async compareRenderResults(
    resultIds: string[]
  ): Promise<{
    comparison: {
      [key: string]: {
        [resultId: string]: any
        differences: string[]
      }
    }
    summary: {
      total_differences: number
      identical_files: string[]
      different_files: string[]
    }
  }> {
    const response = await fetch(`${this.baseUrl}/compare-render-results`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ result_ids: resultIds })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 获取渲染模板列表
   */
  async getRenderableTemplates(): Promise<Array<{
    name: string
    description?: string
    last_rendered?: string
    render_count: number
    status: 'available' | 'error' | 'loading'
  }>> {
    const response = await fetch(`${this.baseUrl}/renderable-templates`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 取消正在进行的渲染
   */
  async cancelRender(renderId: string): Promise<{
    cancelled: boolean
    message: string
  }> {
    const response = await fetch(`${this.baseUrl}/render/${renderId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 获取渲染进度
   */
  async getRenderProgress(renderId: string): Promise<{
    progress: number
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
    message?: string
    current_file?: string
    completed_files?: number
    total_files?: number
  }> {
    const response = await fetch(`${this.baseUrl}/render/${renderId}/progress`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 下载渲染结果文件
   */
  async downloadRenderFile(
    resultId: string,
    filename: string
  ): Promise<Blob> {
    const response = await fetch(
      `${this.baseUrl}/render-results/${resultId}/files/${encodeURIComponent(filename)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.blob()
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    timestamp: string
    services: {
      render_engine: 'healthy' | 'unhealthy'
      template_loader: 'healthy' | 'unhealthy'
      file_system: 'healthy' | 'unhealthy'
    }
    metrics: {
      active_renders: number
      cache_size: number
      memory_usage: number
    }
  }> {
    const response = await fetch(`${this.baseUrl}/render/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }
}

// 创建单例实例
export const renderApi = new RenderApiService()

// 导出类型
export type { RenderResult, RenderSettings, RenderHistoryItem }