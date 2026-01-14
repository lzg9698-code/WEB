/**
 * 模板管理组件类型定义
 * 
 * 此文件必须严格遵循PROJECT_REQUIREMENTS.md文档约束。
 * 任何修改都必须先更新需求文档，然后修改代码。
 * 违反此约束将导致代码被拒绝。
 */

import type { TemplatePackage, ParameterConfig, ValidationResult } from '@/services/api'

// 模板管理器Props接口
export interface TemplateManagerProps {
  // 当前选中的模板包名称
  currentTemplateName?: string
  // 是否显示导入按钮
  showImport?: boolean
  // 是否显示导出按钮
  showExport?: boolean
  // 是否显示新建按钮
  showCreate?: boolean
}

// 模板列表Props接口
export interface TemplateListProps {
  // 当前选中的模板包名称
  currentTemplateName?: string
  // 是否显示复选框
  showCheckbox?: boolean
  // 是否支持批量操作
  showBatchActions?: boolean
  // 是否显示搜索栏
  showSearch?: boolean
  // 是否显示分类筛选
  showCategoryFilter?: boolean
}

// 模板详情Props接口
export interface TemplateDetailProps {
  // 模板包数据
  template: TemplatePackage | null
  // 是否显示编辑按钮
  showEdit?: boolean
  // 是否显示导出按钮
  showExport?: boolean
  // 是否显示删除按钮
  showDelete?: boolean
  // 默认激活的标签页
  defaultTab?: 'overview' | 'files' | 'config' | 'preview'
}

// 创建模板表单接口
export interface CreateTemplateForm {
  // 模板包名称
  name: string
  // 显示名称
  displayName: string
  // 版本号
  version: string
  // 分类
  category: string
  // 描述
  description: string
  // 作者
  author: string
  // 图标
  icon: string
  // 主题色
  color: string
  // 标签列表
  tags: string[]
}

// 模板操作结果接口
export interface TemplateOperationResult {
  // 操作是否成功
  success: boolean
  // 操作消息
  message: string
  // 错误信息
  error?: string
  // 操作数据
  data?: any
  // 时间戳
  timestamp: string
}

// 模板导入选项接口
export interface TemplateImportOptions {
  // 是否覆盖同名模板包
  overwrite?: boolean
  // 是否验证模板包
  validate?: boolean
  // 是否自动扫描依赖
  autoScanDeps?: boolean
}

// 模板导出选项接口
export interface TemplateExportOptions {
  // 导出格式
  format: 'zip' | 'tar' | 'folder'
  // 是否包含源文件
  includeSource?: boolean
  // 是否包含文档
  includeDocs?: boolean
  // 是否压缩
  compress?: boolean
}

// 模板验证结果接口
export interface TemplateValidationResult {
  // 验证是否通过
  valid: boolean
  // 错误列表
  errors: string[]
  // 警告列表
  warnings: string[]
  // 建议列表
  suggestions: string[]
  // 验证详情
  details: {
    configValid: boolean
    filesValid: boolean
    dependenciesValid: boolean
  }
}

// 模板文件信息接口
export interface TemplateFileInfo {
  // 文件名
  name: string
  // 文件路径
  path: string
  // 文件类型
  type: 'template' | 'config' | 'doc' | 'asset'
  // 文件大小
  size: number
  // 修改时间
  modifiedAt: string
  // 是否为必需文件
  required: boolean
}

// 模板统计信息接口
export interface TemplateStats {
  // 模板包总数
  totalPackages: number
  // 按分类统计
  categoryStats: Record<string, number>
  // 按作者统计
  authorStats: Record<string, number>
  // 按版本统计
  versionStats: Record<string, number>
  // 标签使用频率
  tagFrequency: Record<string, number>
  // 创建时间统计
  creationStats: {
    earliest: string
    latest: string
    averageDays: number
  }
}

// 模板搜索过滤器接口
export interface TemplateSearchFilter {
  // 搜索关键词
  query: string
  // 分类筛选
  category: string
  // 标签筛选
  tags: string[]
  // 作者筛选
  author: string
  // 版本筛选
  version: string
  // 创建时间范围
  dateRange: [string, string]
  // 文件类型筛选
  fileTypes: string[]
}

// 模板排序选项接口
export interface TemplateSortOptions {
  // 排序字段
  field: 'name' | 'displayName' | 'version' | 'category' | 'author' | 'createdAt' | 'updatedAt'
  // 排序方向
  direction: 'asc' | 'desc'
}

// 右键菜单操作接口
export interface ContextMenuAction {
  // 操作名称
  name: string
  // 操作图标
  icon: string
  // 操作类型
  type: 'edit' | 'export' | 'copy' | 'delete' | 'validate' | 'refresh'
  // 是否需要确认
  confirm?: boolean
  // 确认消息
  confirmMessage?: string
  // 操作处理函数
  handler: (template: TemplatePackage) => void | Promise<void>
}

// 批量操作选项接口
export interface BatchOperationOptions {
  // 操作类型
  type: 'export' | 'delete' | 'validate' | 'update'
  // 操作名称
  name: string
  // 操作图标
  icon: string
  // 是否需要确认
  confirm?: boolean
  // 确认消息
  confirmMessage?: string
  // 批量处理函数
  handler: (templates: TemplatePackage[]) => void | Promise<void>
}

// 事件接口
export interface TemplateEvents {
  // 模板选择事件
  select: (template: TemplatePackage) => void
  // 模板编辑事件
  edit: (template: TemplatePackage) => void
  // 模板删除事件
  delete: (template: TemplatePackage) => void
  // 模板导出事件
  export: (template: TemplatePackage) => void
  // 模板复制事件
  copy: (template: TemplatePackage) => void
  // 模板验证事件
  validate: (template: TemplatePackage) => void
  // 文件编辑事件
  fileEdit: (file: string) => void
  // 文件创建事件
  fileCreate: (path: string) => void
  // 文件删除事件
  fileDelete: (file: string) => void
  // 搜索事件
  search: (query: string) => void
  // 筛选事件
  filter: (filter: TemplateSearchFilter) => void
  // 排序事件
  sort: (sort: TemplateSortOptions) => void
  // 批量操作事件
  batchOperation: (operation: BatchOperationOptions, templates: TemplatePackage[]) => void
}

// 组件状态接口
export interface TemplateManagerState {
  // 当前选中的模板包
  selectedTemplate: TemplatePackage | null
  // 选中的模板包列表（批量操作）
  selectedTemplates: TemplatePackage[]
  // 搜索关键词
  searchQuery: string
  // 当前分类筛选
  currentCategory: string
  // 当前排序选项
  currentSort: TemplateSortOptions
  // 加载状态
  loading: boolean
  // 错误信息
  error: string | null
  // 是否显示右键菜单
  showContextMenu: boolean
  // 右键菜单位置
  contextMenuPosition: { x: number; y: number }
  // 右键菜单目标
  contextMenuTarget: TemplatePackage | null
  // 统计信息
  stats: TemplateStats
}

// 默认配置
export const DEFAULT_TEMPLATE_MANAGER_CONFIG: Partial<TemplateManagerProps> = {
  showImport: true,
  showExport: true,
  showCreate: true
}

export const DEFAULT_TEMPLATE_LIST_CONFIG: Partial<TemplateListProps> = {
  showCheckbox: true,
  showBatchActions: true,
  showSearch: true,
  showCategoryFilter: true
}

export const DEFAULT_TEMPLATE_DETAIL_CONFIG: Partial<TemplateDetailProps> = {
  showEdit: true,
  showExport: true,
  showDelete: true,
  defaultTab: 'overview'
}

// 常量
export const TEMPLATE_CATEGORIES = [
  '车削',
  '铣削',
  '车铣复合',
  '钻孔',
  '线切割',
  '示例',
  '其他'
] as const

export const TEMPLATE_ICONS = [
  '📦', '🔧', '⚙️', '🛠️', '🔨', '⚡', '🎯', '🚀',
  '💎', '🌟', '⭐', '🔥', '💥', '🎨', '🎭', '🎪'
] as const

export const TEMPLATE_COLORS = [
  '#3498db', '#27ae60', '#e74c3c', '#f39c12', '#9b59b6',
  '#1abc9c', '#2ecc71', '#34495e', '#16a085', '#27ae60',
  '#2980b9', '#8e44ad', '#2c3e50', '#f39c12', '#d35400'
] as const

export const DEFAULT_TEMPLATE_FORM: CreateTemplateForm = {
  name: '',
  displayName: '',
  version: '1.0.0',
  category: '',
  description: '',
  author: '',
  icon: '📦',
  color: '#3498db',
  tags: []
}
