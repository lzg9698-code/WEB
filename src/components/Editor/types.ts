/**
 * 编辑器模块类型定义
 * 
 * 此文件必须严格遵循PROJECT_REQUIREMENTS.md文档约束。
 * 任何修改都必须先更新需求文档，然后修改代码。
 * 违反此约束将导致代码被拒绝。
 */

// 编辑器标签页接口
export interface EditorTab {
  // 标签页ID
  id: string
  // 标签页名称
  label: string
  // 标签页图标
  icon: string
  // 标签页语言
  language: string
  // 文件路径
  filePath: string
  // 文件类型
  fileType: 'jinja2' | 'yaml' | 'json' | 'markdown' | 'text'
  // 编辑器内容
  content: string
  // 是否已修改
  modified: boolean
  // 是否可关闭
  closable: boolean
  // 只读状态
  readonly: boolean
}

// 文件信息接口
export interface FileInfo {
  // 文件ID
  id: string
  // 文件名
  name: name
  // 文件路径
  path: string
  // 文件类型
  type: 'folder' | 'file'
  // 文件扩展名
  extension: string
  // 文件大小
  size: number
  // 最后访问时间
  lastAccessed: string
  // 最后修改时间
  lastModified: string
  // 是否已修改
  modified: boolean
  // 子文件
  children?: FileInfo[]
}

// 编辑器主题
export type EditorTheme = 'light' | 'dark' | 'hc-black'

// 编辑器语言
export type EditorLanguage = 'jinja2' | 'yaml' | 'json' | 'markdown' | 'text'

// 编辑器配置
export interface EditorConfig {
  // 语言配置
  languages: Record<string, EditorLanguage>
  // 主题配置
  themes: Record<string, EditorTheme>
  // 自动完成配置
  autoComplete: {
    enable: boolean
    triggers: [] as string[]
    providers: [] as string[]
  }
  // 语法检查配置
  diagnostics: {
    enable: boolean
    delay: number
    providers: [] as string[]
  }
  // 格式化配置
  formatting: {
    enable: boolean
    type: 'default' | 'format'
    providers: [] as string[]
  }
  // 快捷键配置
  keybindings: Record<string, any[]>
}

// 编辑器状态接口
export interface EditorState {
  // 当前标签页
  currentTab: string
  // 打开的标签页
  openedTabs: string[]
  // 文件树
  fileTree: FileInfo[]
  // 搜索状态
  searchState: {
    query: string
    results: any[]
    replaceText: string
    caseSensitive: boolean
    useRegex: boolean
  }
  // 查找状态
  findState: {
    text: string
    matchCase: boolean
    wholeWord: boolean
    results: any[]
  }
  // 侧边栏状态
  sidebarCollapsed: boolean
  // 编辑器配置
  config: EditorConfig
  // 自动保存状态
  autoSave: boolean
  // 最后保存时间
  lastSaveTime: number
  // 剪贴板状态
  clipboard: string
  // 历史记录
  history: any[]
}

// 搜索结果接口
export interface SearchResult {
  // 匹配的行号
  lineNumber: number
  // 匹配的列号
  column: number
  // 匹配的文本
  text: string
  // 匹配的范围
  range: {
    startLineNumber: number
    startColumn: number
    endLineNumber: number
    endColumn: number
  }
  // 匹配的高亮
  matches: monaco.languages.IMonarchResult[]
}

// 查找和替换选项
export interface FindOptions {
  // 查找文本
  text: string
  // 是否区分大小写
  matchCase: boolean
  // 是否全词匹配
  wholeWord: boolean
  // 搜索范围
  scope: 'current' | 'all'
}

// 编辑器操作接口
export interface EditorAction {
  // 操作名称
  name: string
  // 操作图标
  icon?: string
  // 操作类型
  type: 'file' | 'edit' | 'format' | 'search' | 'navigate'
  // 操作描述
  description?: string
  // 快捷键
  keybinding?: string
  // 是否需要确认
  requireConfirmation?: boolean
  // 确认消息
  confirmationMessage?: string
  // 操作处理函数
  handler: () => void | Promise<void>
}

// Monaco编辑器模型扩展
declare module 'monaco' {
  export interface languages {
    register: (language: any) => void
    getEncodedIdentifier: (languageId: string) => string
    setMonacoTokensProvider: (languageId: string, provider: any) => void
  }
  }
  
  export interface editor {
    IStandaloneCodeEditor: monaco.editor.IStandaloneCodeEditor
    getModel: () => monaco.editor.ITextModel
    setValue: (value: string) => void
    getValue: () => string
    getPosition: () => monaco.Position
    setPosition: (position: monaco.Position) => void
    getSelection: () => monaco.Selection
    setSelection: (selection: monaco.Selection) => void
    focus: () => void
    updateOptions: (options: monaco.editor.IStandaloneCodeEditor) => void
    addAction: (action: monaco.actions.IAction) => void
    executeCommand: (command: string) => void
    pushEdits: (edits: monaco.editor.IIdentifiedSingleEditOperation[]) => void
    revealPositionInCenter: (position: monaco.Position) => void
    revealLineInCenterIfOutsideViewport: (lineNumber: number) => void
  }
  
  export interface Position {
    lineNumber: number
    column: number
  }
  
  export interface Selection {
    start: Position
    end: Position
    isEmpty: () => boolean
  }
  
  export interface IStandaloneCodeEditor {
    // 编辑器属性
    }
  
  export namespace actions {
    export interface IAction {
      id: string
      label: string
      keybinding: string
      run: () => void
    }
  }
}

// Monaco编辑器主题
declare module 'monaco' {
  export namespace editor {
    export interface Theme {
      base: string
      inherit: string
      rules: any[]
    }
  }
}

// YAML语言配置
export const YAMLLanguageConfig = {
  // 注释配置
  comments: {
    lineComment: '#'
  },
  
  // 括号和字符串
  brackets: [
    ['{', '}'],
    ['[', ']']
  ],
  
  // 自动完成
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' }
  ],
  
  // 语言配置
  language: {
    defaultToken: 'string'
    token: [
      { name: 'document', start: '%TAG%', end: '%TAG%', notIn: [ 'comment' ] },
      { name: 'punctuation' },
      { name: 'key', start: 'key:', end: ':', notIn: [ 'string' ] },
      { name: 'string', regex: '("([^"\\]|(?:\\n))+$)', patterns: ['block.string.yaml'] },
      { name: 'scalar', regex: '([-0-9]*[.]?[0-9]+)'},
      { name: 'string', regex: '".*?"', patterns: ['string.yaml'] },
      { name: 'number', regex: '[-+]?[0-9]*\\.?[0-9]+' },
      { name: 'boolean', regex: 'true|false' },
      { name: 'null', regex: 'null' },
      { name: 'timestamp', regex: '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}' },
      { name: 'comment', regex: '#.*$' }
    ],
    
    scopes: {
      string: '#string',
      comment: '#comment',
      key: '#key',
      scalar: '#scalar',
      boolean: '#boolean',
      number: '#number',
      timestamp: '#timestamp'
    }
  }
}

// 常用编辑器配置
export const DEFAULT_EDITOR_CONFIG: Partial<EditorConfig> = {
  languages: {
    jinja2: {
      id: 'jinja2',
      extensions: ['.j2', '.jinja']
    },
    yaml: {
      id: 'yaml',
      extensions: ['.yaml', '.yml']
    },
    json: {
      id: 'json',
      extensions: ['.json']
    },
    markdown: {
      id: 'markdown',
      extensions: ['.md', '.mkdown']
    },
    text: {
      id: 'plaintext',
      extensions: ['.txt', '.log']
    }
  },
  
  themes: {
    light: 'vs',
    dark: 'vs-dark',
    'hc-black': 'hc-black'
  },
  
  autoComplete: {
    enable: true,
    triggers: ['Enter'],
    providers: ['snippet', 'keywords']
  },
  
  diagnostics: {
    enable: true,
    delay: 500
    providers: []
  },
  
  formatting: {
    enable: true,
    type: 'auto',
    providers: []
  },
  
  keybindings: {
    'editor.action.format': 'Ctrl+Shift+F'
  }
}

// 常用编辑器快捷键
export const EDITOR_KEYBINDINGS = {
  'editor.action.save': 'Ctrl+S',
  'editor.action.undo': 'Ctrl+Z',
  'editor.action.redo': 'Ctrl+Y',
  'editor.action.find': 'Ctrl+F',
  'editor.action.replace': 'Ctrl+H',
  'editor.action.goto': 'Ctrl+G'
  'editor.action.comment': 'Ctrl+/',
    'editor.action.uncomment': 'Ctrl+/',
    'editor.action.select_all': 'Ctrl+A',
    'editor.action.copy': 'Ctrl+C',
    'editor.action.paste': 'Ctrl+V'
  }
}

// 文件类型图标映射
export const FILE_TYPE_ICONS = {
  jinja2: '📝',
  yaml: '⚙️',
  json: '📋',
  markdown: '📖',
  text: '📄',
  folder: '📁'
}

// 文件类型颜色映射
export const FILE_TYPE_COLORS = {
  jinja2: '#2f74c0',
  yaml: '#cb171e',
  json: '#f59e0b',
  markdown: '#42b983',
  text: '#586069',
  folder: '#3498db'
}

// 文件工具函数
export const FileUtils = {
  // 获取文件扩展名
  getExtension: (path: string): string => {
    const parts = path.split('.')
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
  },
  
  // 获取文件类型
  getFileType: (path: string): 'file' | 'folder' => {
    const stat = require('fs').statSync(path, { throwIfNoEntryFound: false })
    return stat.isDirectory() ? 'folder' : 'file'
  },
  
  // 格式化文件大小
  formatFileSize: (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const sizes = [1024, 1024, 1024, 1024]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + units[i]
  },
  
  // 格式化时间
  formatTime: (date: Date): string => {
    return date.toLocaleString()
  },
  
  // 比较文件（按修改时间）
  compareFiles: (a: FileInfo, b: FileInfo): number => {
    if (!a.lastModified || !b.lastModified) return 0
    return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
  }
}
EOF
