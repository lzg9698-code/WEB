/**
 * 参数管理组件类型定义
 * 
 * 此文件必须严格遵循PROJECT_REQUIREMENTS.md文档约束。
 * 任何修改都必须先更新需求文档，然后修改代码。
 * 违反此约束将导致代码被拒绝。
 */

import type { ParameterConfig, ValidationResult } from '@/services/api'

// 参数输入组件Props接口
export interface ParameterInputProps {
  // 参数配置
  parameter: {
    key: string
    type: string
    label: string
    description?: string
    default?: any
    required?: boolean
    unit?: string
    range?: [any, any]
    options?: any[]
    validation?: any
  }
  // 参数值
  modelValue: any
  // 是否禁用
  disabled?: boolean
  // 错误信息
  error?: string
  // 警告信息
  warning?: string
  // 是否显示帮助信息
  showHelp?: boolean
  // 是否显示重置按钮
  showReset?: boolean
  // 输入框尺寸
  size?: 'large' | 'default' | 'small'
  // 占位符
  placeholder?: string
  // 是否只读
  readonly?: boolean
}

// 参数组组件Props接口
export interface ParameterGroupProps {
  // 参数组配置
  group: {
    key: string
    name: string
    icon?: string
    description?: string
    parameters: Array<{
      key: string
      groupKey: string
      paramKey: string
      type: string
      label: string
      description?: string
      default?: any
      required?: boolean
      unit?: string
      range?: [any, any]
      options?: any[]
    }>
  }
  // 参数值
  modelValue: Record<string, any>
  // 验证结果
  validation?: ValidationResult
  // 是否禁用
  disabled?: boolean
  // 是否可折叠
  collapsible?: boolean
  // 默认折叠状态
  defaultCollapsed?: boolean
  // 是否显示统计信息
  showStats?: boolean
  // 是否显示操作按钮
  showActions?: boolean
}

// 参数管理器组件Props接口
export interface ParameterManagerProps {
  // 当前模板包
  currentTemplate: {
    name: string
    displayName: string
    version: string
    category: string
    tags: string[]
    author: string
    icon: string
    color: string
    config?: ParameterConfig
  } | null
  // 是否启用自动验证
  autoValidate?: boolean
  // 是否启用自动计算
  autoCalculate?: boolean
  // 是否显示概览卡片
  showOverview?: boolean
  // 是否显示进度条
  showProgress?: boolean
  // 是否显示快速操作
  showQuickActions?: boolean
  // 是否启用批量操作
  enableBatchOps?: boolean
}

// 参数预设接口
export interface ParameterPreset {
  // 预设名称
  name: string
  // 预设描述
  description?: string
  // 预设参数
  parameters: Record<string, any>
  // 关联的模板包
  template?: string
  // 创建时间
  createdAt: string
  // 更新时间
  updatedAt?: string
  // 预设标签
  tags?: string[]
  // 是否为内置预设
  builtin?: boolean
}

// 参数验证规则接口
export interface ParameterValidationRule {
  // 规则名称
  name: string
  // 规则描述
  description?: string
  // 验证函数
  validator: (value: any, parameter: any, allParameters: Record<string, any>) => boolean | string
  // 规则类型
  type: 'required' | 'type' | 'range' | 'format' | 'custom'
  // 规则优先级
  priority?: number
  // 错误消息模板
  message?: string
  // 规则是否启用
  enabled?: boolean
}

// 参数转换器接口
export interface ParameterTransformer {
  // 转换器名称
  name: string
  // 转换器描述
  description?: string
  // 转换函数
  transformer: (value: any, parameter: any, allParameters: Record<string, any>) => any
  // 反向转换函数
  reverseTransformer?: (value: any, parameter: any, allParameters: Record<string, any>) => any
  // 支持的参数类型
  supportedTypes?: string[]
  // 是否启用
  enabled?: boolean
}

// 参数计算器接口
export interface ParameterCalculator {
  // 计算器名称
  name: string
  // 计算器描述
  description?: string
  // 计算函数
  calculator: (allParameters: Record<string, any>) => Record<string, any>
  // 依赖的参数
  dependencies?: string[]
  // 计算优先级
  priority?: number
  // 是否自动触发
  autoTrigger?: boolean
}

// 参数导入导出选项接口
export interface ParameterImportOptions {
  // 导入格式
  format: 'json' | 'yaml' | 'csv' | 'excel'
  // 是否覆盖现有参数
  overwrite?: boolean
  // 是否验证参数
  validate?: boolean
  // 是否触发计算
  triggerCalculation?: boolean
  // 导入文件编码
  encoding?: string
  // 是否跳过未知参数
  skipUnknown?: boolean
}

export interface ParameterExportOptions {
  // 导出格式
  format: 'json' | 'yaml' | 'csv' | 'excel'
  // 是否包含元数据
  includeMetadata?: boolean
  // 是否包含验证结果
  includeValidation?: boolean
  // 是否包含计算值
  includeCalculated?: boolean
  // 导出文件名
  filename?: string
  // 导出文件编码
  encoding?: string
  // 是否美化输出
  pretty?: boolean
}

// 参数组统计信息接口
export interface ParameterGroupStats {
  // 组名称
  groupName: string
  // 总参数数
  totalParameters: number
  // 必填参数数
  requiredParameters: number
  // 已填写参数数
  filledParameters: number
  // 错误数
  errorCount: number
  // 警告数
  warningCount: number
  // 完成度百分比
  completionPercentage: number
  // 最新的修改时间
  lastModified?: string
}

// 参数历史记录接口
export interface ParameterHistory {
  // 历史ID
  id: string
  // 操作类型
  action: 'create' | 'update' | 'delete' | 'reset'
  // 操作时间
  timestamp: string
  // 操作的用户
  user?: string
  // 操作的参数键
  parameterKey?: string
  // 操作前的值
  oldValue?: any
  // 操作后的值
  newValue?: any
  // 操作描述
  description?: string
  // 是否为自动操作
  automatic?: boolean
}

// 参数搜索过滤器接口
export interface ParameterSearchFilter {
  // 搜索关键词
  query: string
  // 参数类型过滤
  types?: string[]
  // 是否必填过滤
  required?: boolean
  // 是否有错误过滤
  hasErrors?: boolean
  // 是否有警告过滤
  hasWarnings?: boolean
  // 参数组过滤
  groups?: string[]
  // 值范围过滤
  valueRange?: [any, any]
}

// 参数排序选项接口
export interface ParameterSortOptions {
  // 排序字段
  field: 'key' | 'label' | 'type' | 'required' | 'value' | 'lastModified'
  // 排序方向
  direction: 'asc' | 'desc'
  // 排序类型
  type: 'string' | 'number' | 'boolean' | 'date'
}

// 参数批量操作接口
export interface ParameterBatchOperation {
  // 操作类型
  type: 'validate' | 'reset' | 'clear' | 'export' | 'import'
  // 操作名称
  name: string
  // 操作描述
  description?: string
  // 操作图标
  icon?: string
  // 是否需要确认
  confirm?: boolean
  // 确认消息
  confirmMessage?: string
  // 批量处理函数
  handler: (parameters: string[]) => void | Promise<void>
  // 操作参数
  options?: Record<string, any>
  // 操作条件
  condition?: (key: string, value: any) => boolean
}

// 参数设置接口
export interface ParameterSettings {
  // 是否启用实时验证
  enableRealTimeValidation: boolean
  // 验证延迟（毫秒）
  validationDelay: number
  // 是否启用自动计算
  enableAutoCalculation: boolean
  // 计算触发条件
  calculationTrigger: 'change' | 'blur' | 'manual'
  // 是否启用参数历史
  enableHistory: boolean
  // 历史记录数量限制
  historyLimit: number
  // 是否启用预设管理
  enablePresets: boolean
  // 预设存储位置
  presetStorage: 'local' | 'session' | 'server'
  // 是否启用搜索功能
  enableSearch: boolean
  // 搜索延迟（毫秒）
  searchDelay: number
  // 是否启用分组显示
  enableGrouping: boolean
  // 默认分组方式
  defaultGrouping: 'category' | 'type' | 'custom'
  // 是否启用排序功能
  enableSorting: boolean
  // 默认排序字段
  defaultSort: ParameterSortOptions
}

// 参数组件状态接口
export interface ParameterComponentState {
  // 当前选择的参数
  selectedParameters: string[]
  // 搜索关键词
  searchQuery: string
  // 当前排序
  currentSort: ParameterSortOptions
  // 当前过滤器
  currentFilter: ParameterSearchFilter
  // 验证状态
  validationState: {
    isValidating: boolean
    lastValidation: string
    validationCount: number
  }
  // 计算状态
  calculationState: {
    isCalculating: boolean
    lastCalculation: string
    calculationCount: number
  }
  // UI状态
  uiState: {
    isCollapsed: boolean
    isFullscreen: boolean
    activeTab: string
    sidebarWidth: number
  }
}

// 常量定义
export const PARAMETER_TYPES = [
  'string',
  'number',
  'boolean',
  'array',
  'object',
  'length',
  'angle',
  'speed',
  'coordinate',
  'tool',
  'material'
] as const

export const PARAMETER_VALIDATION_TYPES = [
  'required',
  'type',
  'range',
  'format',
  'custom'
] as const

export const PARAMETER_IMPORT_FORMATS = [
  'json',
  'yaml',
  'csv',
  'excel'
] as const

export const PARAMETER_EXPORT_FORMATS = [
  'json',
  'yaml',
  'csv',
  'excel'
] as const

export const DEFAULT_PARAMETER_SETTINGS: Partial<ParameterSettings> = {
  enableRealTimeValidation: true,
  validationDelay: 300,
  enableAutoCalculation: true,
  calculationTrigger: 'change',
  enableHistory: true,
  historyLimit: 50,
  enablePresets: true,
  presetStorage: 'local',
  enableSearch: true,
  searchDelay: 200,
  enableGrouping: true,
  defaultGrouping: 'category',
  enableSorting: true,
  defaultSort: {
    field: 'label',
    direction: 'asc',
    type: 'string'
  }
}

export const COMMON_PARAMETER_PRESETS = [
  {
    name: '车削粗加工',
    description: '车削粗加工常用参数',
    parameters: {
      'cutting.depth': 5,
      'cutting.feed_rate': 200,
      'spindle.speed': 1500
    }
  },
  {
    name: '车削精加工',
    description: '车削精加工常用参数',
    parameters: {
      'cutting.depth': 0.5,
      'cutting.feed_rate': 100,
      'spindle.speed': 3000
    }
  },
  {
    name: '铣削粗加工',
    description: '铣削粗加工常用参数',
    parameters: {
      'cutting.depth': 3,
      'cutting.feed_rate': 300,
      'spindle.speed': 2000
    }
  },
  {
    name: '铣削精加工',
    description: '铣削精加工常用参数',
    parameters: {
      'cutting.depth': 0.8,
      'cutting.feed_rate': 150,
      'spindle.speed': 4000
    }
  }
] as const

// 工具函数
export const getParameterTypeIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    'string': '📝',
    'number': '🔢',
    'boolean': '☑️',
    'array': '📋',
    'object': '📊',
    'length': '📏',
    'angle': '📐',
    'speed': '⚡',
    'coordinate': '📍',
    'tool': '🔧',
    'material': '🧱'
  }
  return iconMap[type] || '❓'
}

export const getParameterTypeColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    'string': '#409EFF',
    'number': '#67C23A',
    'boolean': '#E6A23C',
    'array': '#909399',
    'object': '#606266',
    'length': '#F56C6C',
    'angle': '#E6A23C',
    'speed': '#F7BA2A',
    'coordinate': '#13C2C2',
    'tool': '#606266',
    'material': '#956A74'
  }
  return colorMap[type] || '#909399'
}

export const formatParameterValue = (value: any, type: string): string => {
  if (value === null || value === undefined) {
    return ''
  }

  switch (type) {
    case 'boolean':
      return value ? '是' : '否'
    case 'array':
      return Array.isArray(value) ? value.join(', ') : String(value)
    case 'object':
      return typeof value === 'object' ? JSON.stringify(value) : String(value)
    case 'number':
    case 'length':
    case 'angle':
    case 'speed':
      return Number(value).toLocaleString()
    default:
      return String(value)
  }
}

export const parseParameterValue = (value: string, type: string): any => {
  switch (type) {
    case 'boolean':
      return value === '是' || value === 'true' || value === true
    case 'number':
    case 'length':
    case 'angle':
    case 'speed':
      return parseFloat(value) || 0
    case 'array':
      try {
        return value ? value.split(',').map(v => v.trim()) : []
      } catch {
        return []
      }
    case 'object':
      try {
        return value ? JSON.parse(value) : {}
      } catch {
        return {}
      }
    default:
      return value
  }
}
