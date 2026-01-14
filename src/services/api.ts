/**
 * API服务模块
 * 
 * 此文件必须严格遵循PROJECT_REQUIREMENTS.md文档约束。
 * 任何修改都必须先更新需求文档，然后修改代码。
 * 违反此约束将导致代码被拒绝。
 */

import axios from 'axios'

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  timeout: 60000,  // 增加超时时间，支持大文件上传
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    console.log('🔒 API请求 - 约束机制已激活')
    console.log(`📋 严格遵循PROJECT_REQUIREMENTS.md文档`)
    console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    console.error('API请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    console.log('✅ API响应成功:', response.config.url)
    return response
  },
  (error) => {
    console.error('API响应错误:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

// 模板管理API
export const templateApi = {
  // 获取所有模板包
  getTemplates: () => {
    return api.get('/templates/')
  },

  // 获取指定模板包详情
  getTemplate: (packageName: string) => {
    return api.get(`/templates/${packageName}`)
  },

  // 扫描模板包
  scanTemplates: () => {
    return api.post('/templates/scan')
  },

  // 导入模板包（上传zip文件）
  importTemplate: (file: File, onProgress?: (progress: number) => void) => {
    const formData = new FormData()
    formData.append('file', file)
    
    return api.post('/templates/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      },
    })
  },

  // 删除模板包
  deleteTemplate: (packageName: string) => {
    return api.delete(`/templates/${packageName}`)
  },

  // 导出模板包
  exportTemplate: (packageName: string): Promise<Blob> => {
    return api.get(`/templates/${packageName}/export`, {
      responseType: 'blob',
    })
  },
}

// 参数管理API
export const parameterApi = {
  // 获取参数配置
  getParameterConfig: (packageName: string) => {
    return api.get(`/parameters/${packageName}/config`)
  },

  // 验证参数值
  validateParameters: (packageName: string, parameters: Record<string, any>) => {
    return api.post(`/parameters/${packageName}/validate`, { parameters })
  },

  // 计算派生参数
  calculateParameters: (packageName: string, parameters: Record<string, any>) => {
    return api.post(`/parameters/${packageName}/calculate`, { parameters })
  },
}

// 渲染API
export const renderApi = {
  // 渲染模板包
  render: (packageName: string, parameters: Record<string, any>) => {
    return api.post(`/render/templates/${packageName}/render`, { parameters })
  },

  // 验证模板
  validate: (packageName: string, data: Record<string, any>) => {
    return api.post(`/render/templates/${packageName}/validate`, data)
  },
}

// 系统API
export const systemApi = {
  // 健康检查
  healthCheck: () => {
    return api.get('/health')
  },

  // 应用信息
  getAppInfo: () => {
    return api.get('/info')
  },
}

// 类型定义
export interface TemplatePackage {
  name: string
  displayName: string
  version: string
  description: string
  category: string
  tags: string[]
  author: string
  icon: string
  color: string
  templateFiles: string[]
}

export interface ParameterConfig {
  groups: Record<string, {
    name: string
    icon?: string
    parameters: Record<string, {
      type: string
      label: string
      description?: string
      default?: any
      required?: boolean
      unit?: string
      range?: [any, any]
      options?: any[]
    }>
  }>
}

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
  warnings: Record<string, string>
}

export interface RenderResult {
  success: boolean
  files: Record<string, string>
  render_time: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
}

export default api
