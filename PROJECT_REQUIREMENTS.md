# 项目需求设计文档 - 模板驱动的数控程序生成器

## 📋 项目概述

### 项目名称
模板驱动的数控程序生成器 (Template-Driven CNC Program Generator)

### 项目目标
开发一个基于模板包的数控程序生成系统，支持用户通过可视化界面管理模板包、配置参数，并渲染生成标准G代码或其他格式的数控程序。

### 核心价值
- **模板驱动**：用户可自定义模板包，无需编程知识
- **参数管理**：强大的参数系统，支持验证、计算和预设
- **实时预览**：所见即所得的渲染预览
- **多格式输出**：支持多种数控程序格式输出

## 🏗️ 系统架构

### 技术栈
- **前端**：Vue.js 3 + TypeScript + Pinia
- **后端**：Python Flask + Jinja2 + PyYAML
- **编辑器**：Monaco Editor (VS Code同款)
- **配置格式**：YAML
- **模板引擎**：Jinja2

### 系统分层
```
┌─────────────────────────────────────────┐
│              前端层 (Vue.js)            │
├─────────────────────────────────────────┤
│              API层 (Flask REST)         │
├─────────────────────────────────────────┤
│              业务逻辑层                  │
├─────────────────────────────────────────┤
│              数据访问层                  │
├─────────────────────────────────────────┤
│              文件系统层                  │
└─────────────────────────────────────────┘
```

## 📦 模块设计

### 1. 模板管理模块 (TemplateManager)

#### 职责边界
- ✅ 模板包的导入、导出、安装、卸载
- ✅ 模板包信息管理（版本、依赖、分类）
- ✅ 模板包列表展示和搜索
- ❌ 不负责模板内容编辑（由编辑器模块负责）
- ❌ 不负责参数验证（由参数管理模块负责）

#### 核心功能
1. **模板包扫描**：自动扫描packages目录下的所有模板包
2. **模板包验证**：验证package.yaml的完整性和正确性
3. **模板包导入**：支持zip格式的模板包导入
4. **模板包导出**：将模板包打包为zip文件
5. **依赖管理**：检查和管理模板包依赖关系

#### 数据结构
```python
class TemplatePackage:
    path: str              # 模板包路径
    config: dict           # YAML配置内容
    name: str              # 包名
    display_name: str      # 显示名
    version: str           # 版本号
    category: str          # 分类
    tags: List[str]        # 标签列表
    author: str            # 作者
    description: str       # 描述
```

#### API接口
```
GET    /api/templates                    # 获取模板包列表
GET    /api/templates/{id}               # 获取模板包详情
POST   /api/templates/import             # 导入模板包
GET    /api/templates/{id}/export        # 导出模板包
DELETE /api/templates/{id}               # 删除模板包
```

### 2. 参数管理模块 (ParameterManager)

#### 职责边界
- ✅ 参数定义的解析和管理
- ✅ 参数值的验证和类型检查
- ✅ 参数预设的管理和应用
- ✅ 派生参数的计算
- ❌ 不负责参数输入界面（由前端组件负责）
- ❌ 不负责参数存储（由文件管理模块负责）

#### 支持的参数类型
```yaml
基础类型:
  - string: 字符串
  - number: 数字（整数/浮点数）
  - boolean: 布尔值
  - array: 数组
  - object: 对象

扩展类型:
  - length: 长度（带单位mm/inch）
  - angle: 角度（度/弧度）
  - speed: 速度（rpm/mm/min）
  - coordinate: 坐标（X/Y/Z）
  - tool: 刀具参数
  - material: 材料参数
```

#### 参数验证规则
```yaml
validation:
  type_check: true        # 类型检查
  range_check: true       # 范围检查
  required_check: true    # 必填检查
  custom_rules: []        # 自定义验证规则
```

#### API接口
```
GET    /api/templates/{id}/parameters    # 获取参数定义
POST   /api/templates/{id}/validate      # 验证参数值
GET    /api/parameters/presets           # 获取参数预设
POST   /api/parameters/presets           # 保存参数预设
```

### 3. 编辑器模块 (EditorManager)

#### 职责边界
- ✅ 模板文件的编辑和语法高亮
- ✅ YAML配置文件的可视化和代码编辑
- ✅ 实时预览和错误检查
- ✅ 文件的新建、保存、删除
- ❌ 不负责模板渲染（由渲染器模块负责）
- ❌ 不负责文件系统操作（由文件管理模块负责）

#### 编辑器功能
1. **模板编辑器**
   - Monaco Editor集成
   - Jinja2语法高亮
   - 智能提示和自动补全
   - 代码折叠和迷你地图
   - 多标签页支持

2. **YAML配置编辑器**
   - 双模式编辑：可视化表单 + YAML代码
   - 实时语法验证
   - 结构化编辑
   - 参数类型选择器

#### 支持的文件类型
```
模板文件: .j2 (Jinja2模板)
配置文件: .yaml (YAML配置)
文档文件: .md (Markdown)
```

#### API接口
```
GET    /api/templates/{id}/files         # 获取文件列表
GET    /api/templates/{id}/files/{path}  # 获取文件内容
PUT    /api/templates/{id}/files/{path}  # 保存文件内容
POST   /api/templates/{id}/files         # 创建新文件
DELETE /api/templates/{id}/files/{path}  # 删除文件
```

### 4. 文件管理模块 (FileManager)

#### 职责边界
- ✅ 模板包文件的存储和组织
- ✅ 导出文件的管理
- ✅ 备份和恢复功能
- ✅ 文件上传和下载
- ❌ 不负责文件内容解析（由对应模块负责）
- ❌ 不负责文件权限管理（系统级）

#### 目录结构
```
workspace/
├── packages/              # 模板包目录
│   ├── package1/
│   │   ├── package.yaml
│   │   ├── templates/
│   │   └── docs/
│   └── package2/
├── exports/               # 导出文件目录
├── backups/               # 备份目录
├── temp/                  # 临时文件目录
└── config/                # 系统配置目录
```

#### 文件操作
- 文件的创建、读取、更新、删除
- 目录的创建和遍历
- 文件复制和移动
- 文件压缩和解压

#### API接口
```
GET    /api/files                        # 获取文件列表
POST   /api/files/upload                 # 上传文件
GET    /api/files/{path}/download        # 下载文件
DELETE /api/files/{path}                 # 删除文件
POST   /api/files/backup                 # 创建备份
GET    /api/files/backup/{id}/restore    # 恢复备份
```

### 5. 模板渲染模块 (RenderEngine)

#### 职责边界
- ✅ Jinja2模板的解析和渲染
- ✅ 多文件批量渲染
- ✅ 实时预览渲染
- ✅ 文件名生成
- ❌ 不负责参数验证（渲染前已完成）
- ❌ 不负责文件保存（由文件管理模块负责）

#### 渲染功能
1. **单文件渲染**：渲染指定的Jinja2模板
2. **批量渲染**：根据输出配置渲染多个文件
3. **实时预览**：参数变化时的增量渲染
4. **错误处理**：模板语法错误的捕获和报告

#### Jinja2扩展
```python
# 自定义过滤器
filters:
  - round: 四舍五入
  - format: 格式化
  - unit: 单位转换
  - safe: 安全转义

# 自定义函数
functions:
  - sin: 正弦函数
  - cos: 余弦函数
  - sqrt: 平方根
  - abs: 绝对值
```

#### API接口
```
POST   /api/templates/{id}/render        # 渲染模板包
GET    /api/templates/{id}/preview       # 实时预览
POST   /api/render/single                # 单文件渲染
```

## 📄 模板包规范

### 模板包结构
```
template_package/
├── package.yaml           # 唯一配置文件（必需）
├── templates/             # 模板文件目录（必需）
│   ├── main.j2           # 主模板文件
│   ├── sub_template.j2   # 子模板文件
│   └── macros.j2         # 宏定义文件
├── presets.json          # 参数预设（可选）
├── docs/                 # 文档目录（可选）
│   └── README.md
└── assets/               # 资源文件（可选）
    └── icon.png
```

### package.yaml 配置规范

#### 基本信息配置
```yaml
package:
  name: string              # 包名（必需，英文，唯一）
  displayName: string       # 显示名（必需，支持中文）
  version: string           # 版本号（必需，语义化版本）
  description: string       # 描述（必需）
  category: string          # 分类（必需）
  tags: list[string]        # 标签列表（可选）
  author: string            # 作者（可选）
  icon: string              # 图标（可选，emoji或文件路径）
  color: string             # 主题色（可选，十六进制）
  language: string           # 语言（可选，默认zh-CN）
```

#### 依赖配置
```yaml
dependencies: list[string]   # 依赖的模板包列表（可选）
```

#### 模板配置
```yaml
templates:
  main: string               # 主模板文件路径（必需）
  # 其他模板文件通过outputs配置引用
```

#### 变量配置
```yaml
variables:
  groups:
    group_name:
      name: string           # 组显示名（必需）
      icon: string           # 组图标（可选）
      description: string    # 组描述（可选）
      parameters:
        param_name:
          type: string        # 参数类型（必需）
          label: string        # 参数标签（必需）
          description: string  # 参数描述（可选）
          default: any         # 默认值（可选）
          required: boolean    # 是否必填（可选，默认false）
          unit: string         # 单位（可选）
          range: list[any]     # 取值范围（可选）
          options: list[any]   # 选项列表（select类型必需）
          validation: dict     # 验证规则（可选）
```

#### 输出配置
```yaml
outputs:
  default_format: string     # 默认输出格式（必需）
  supported_formats: list[string]  # 支持的格式（必需）
  files:
    output_name:
      template: string        # 模板文件路径（必需）
      filename_pattern: string # 文件名模式（必需，支持变量）
      extension: string      # 文件后缀（必需）
      description: string    # 描述（必需）
      enabled: boolean        # 是否启用（可选，默认true）
      is_default: boolean    # 是否默认输出（可选，默认false）
```

#### 预设配置
```yaml
presets:
  preset_name:
    description: string      # 预设描述（必需）
    parameters: dict         # 参数值（必需）
```

#### 验证配置
```yaml
validation:
  rules:
    rule_name:
      condition: string      # 验证条件（必需）
      message: string       # 错误消息（必需）
      level: string          # 级别：error/warning/info（必需）
```

## 🎨 用户界面设计

### 主界面布局
```
┌─────────────────────────────────────────────────────────────┐
│                        顶部工具栏                            │
├─────────────────────────────────────────────────────────────┤
│  左侧面板        │              中间工作区              │  右侧面板  │
│  ┌──────────┐    │  ┌─────────────────────────────┐  │ ┌────────┐ │
│  │模板包列表 │    │  │        编辑器/预览区         │  │  │参数面板│ │
│  │          │    │  │                             │  │  │        │ │
│  │🔄车铣复合 │    │  │  G00 X{{start_x}}            │  │  │工件参数│ │
│  │🔧铣削专用 │    │  │  G01 Z{{depth}} F{{feed}}    │  │  │刀具参数│ │
│  │📦车削基础 │    │  │  {% for p in points %}        │  │  │工艺参数│ │
│  │          │    │  │    G01 X{{p.x}} Y{{p.y}}     │  │  │        │ │
│  └──────────┘    │  │  {% endfor %}                │  │  └────────┘ │
│                 │  └─────────────────────────────┘  │             │
│  ┌──────────┐    │                                 │  ┌────────┐ │
│  │文件树    │    │  ┌─────────────────────────────┐  │  │输出面板│ │
│  │📁templates│    │  │        参数输入区           │  │  │        │ │
│  │  📄main.j2│    │  │                             │  │  │☑主程序 │ │
│  │  📄sub.j2 │    │  │  程序名: [TEST001        ]  │  │  │☐子程序 │ │
│  │📄package  │    │  │  刀具号: [1               ]  │  │  │☐刀具列表│ │
│  │  .yaml    │    │  │  转速:   [3000        ]rpm │  │  │        │ │
│  └──────────┘    │  └─────────────────────────────┘  │  └────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 界面功能分区

#### 1. 顶部工具栏
- 新建模板包
- 导入模板包
- 导出模板包
- 保存当前工作
- 预览渲染结果
- 导出文件

#### 2. 左侧面板
- **模板包列表**：显示所有可用模板包
- **文件树**：显示当前模板包的文件结构
- **搜索框**：快速搜索模板包和文件

#### 3. 中间工作区
- **编辑器标签页**：模板编辑、配置编辑
- **预览标签页**：实时预览渲染结果
- **参数输入标签页**：参数配置界面

#### 4. 右侧面板
- **参数面板**：显示和编辑参数
- **输出面板**：选择输出文件
- **属性面板**：显示当前选中项的属性

## 🔄 工作流程

### 模板包创建流程
```
1. 点击"新建模板包"
   ↓
2. 填写基本信息（名称、版本、描述等）
   ↓
3. 创建模板包目录结构
   ↓
4. 生成package.yaml配置文件
   ↓
5. 创建默认模板文件
   ↓
6. 打开编辑器进行编辑
```

### 模板包使用流程
```
1. 从模板包列表选择模板包
   ↓
2. 系统加载模板包配置和参数定义
   ↓
3. 用户在参数面板填写参数值
   ↓
4. 实时验证参数有效性
   ↓
5. 用户选择要输出的文件
   ↓
6. 点击"渲染"生成结果
   ↓
7. 预览渲染结果
   ↓
8. 导出文件到指定目录
```

### 模板编辑流程
```
1. 在文件树中选择要编辑的文件
   ↓
2. 在编辑器中打开文件
   ↓
3. 编辑文件内容（语法高亮、智能提示）
   ↓
4. 实时预览渲染结果
   ↓
5. 保存文件更改
   ↓
6. 更新相关配置（如需要）
```

## 📊 数据模型

### 核心实体

#### TemplatePackage（模板包）
```python
class TemplatePackage:
    id: str                  # 唯一标识
    name: str                # 包名
    display_name: str        # 显示名
    version: str             # 版本号
    description: str         # 描述
    category: str            # 分类
    tags: List[str]          # 标签
    author: str              # 作者
    icon: str                # 图标
    color: str               # 主题色
    config_path: str         # 配置文件路径
    templates_path: str      # 模板目录路径
    created_at: datetime     # 创建时间
    updated_at: datetime     # 更新时间
```

#### Parameter（参数）
```python
class Parameter:
    name: str                # 参数名
    type: str                # 参数类型
    label: str               # 显示标签
    description: str         # 描述
    default_value: any       # 默认值
    required: bool           # 是否必填
    unit: str                # 单位
    range: Tuple[any, any]    # 取值范围
    options: List[any]       # 选项列表
    validation_rules: List[ValidationRule]  # 验证规则
```

#### OutputFile（输出文件）
```python
class OutputFile:
    name: str                # 输出文件名
    template_path: str       # 模板文件路径
    filename_pattern: str    # 文件名模式
    extension: str           # 文件后缀
    description: str         # 描述
    enabled: bool            # 是否启用
    is_default: bool         # 是否默认
```

### 配置文件结构

#### package.yaml 完整结构
```yaml
# 基本信息（必需）
package:
  name: string
  displayName: string
  version: string
  description: string
  category: string
  tags: list[string]
  author: string
  icon: string
  color: string
  language: string

# 依赖关系（可选）
dependencies: list[string]

# 模板配置（必需）
templates:
  main: string

# 变量定义（必需）
variables:
  groups:
    group_name:
      name: string
      icon: string
      description: string
      parameters:
        param_name:
          type: string
          label: string
          description: string
          default: any
          required: boolean
          unit: string
          range: list[any]
          options: list[any]
          validation: dict

# 输出配置（必需）
outputs:
  default_format: string
  supported_formats: list[string]
  files:
    output_name:
      template: string
      filename_pattern: string
      extension: string
      description: string
      enabled: boolean
      is_default: boolean

# 预设配置（可选）
presets:
  preset_name:
    description: string
    parameters: dict

# 验证配置（可选）
validation:
  rules:
    rule_name:
      condition: string
      message: string
      level: string
```

## 🔧 技术实现细节

### 前端技术栈

#### Vue.js 3 组件架构
```typescript
// 主应用组件
App.vue
├── HeaderBar.vue          # 顶部工具栏
├── MainLayout.vue         # 主布局
│   ├── TemplateList.vue   # 模板包列表
│   ├── FileTree.vue       # 文件树
│   ├── EditorTabs.vue     # 编辑器标签页
│   ├── ParameterPanel.vue # 参数面板
│   └── OutputPanel.vue    # 输出面板
└── StatusBar.vue          # 状态栏
```

#### 状态管理 (Pinia)
```typescript
// 模板包状态
export const useTemplateStore = defineStore('template', {
  state: () => ({
    packages: [] as TemplatePackage[],
    currentPackage: null as TemplatePackage | null,
    loading: false,
    error: null as string | null
  }),
  actions: {
    async loadPackages(): Promise<void>
    async selectPackage(id: string): Promise<void>
    async importPackage(file: File): Promise<void>
    async exportPackage(id: string): Promise<void>
  }
})

// 参数状态
export const useParameterStore = defineStore('parameter', {
  state: () => ({
    parameters: {} as Record<string, any>,
    validation: {} as ValidationResult,
    presets: [] as ParameterPreset[],
    currentPreset: null as string | null
  }),
  actions: {
    async loadParameters(packageId: string): Promise<void>
    async validateParameters(packageId: string, params: Record<string, any>): Promise<ValidationResult>
    async savePreset(name: string, params: Record<string, any>): Promise<void>
    async loadPreset(presetId: string): Promise<void>
  }
})

// 编辑器状态
export const useEditorStore = defineStore('editor', {
  state: () => ({
    currentFile: null as FileItem | null,
    openTabs: [] as FileItem[],
    activeTab: null as string | null,
    previewContent: '',
    renderErrors: [] as string[]
  }),
  actions: {
    async openFile(path: string): Promise<void>
    async saveFile(path: string, content: string): Promise<void>
    async closeFile(path: string): Promise<void>
    async renderPreview(): Promise<void>
  }
})
```

#### Monaco Editor 集成
```typescript
// 编辑器配置
const editorOptions = {
  language: 'jinja2',
  theme: 'vs-dark',
  automaticLayout: true,
  minimap: { enabled: true },
  lineNumbers: 'on',
  wordWrap: 'on',
  folding: true,
  fontSize: 14,
  tabSize: 2
}

// Jinja2 语法高亮配置
monaco.languages.register({ id: 'jinja2' })
monaco.languages.setMonarchTokensProvider('jinja2', {
  tokenizer: {
    root: [
      [/\{\{.*?\}\}/, 'variable'],
      [/\{%.*?%\}/, 'keyword'],
      [/\{#.*?#\}/, 'comment'],
      [/G\d+/, 'function'],           // G代码
      [/M\d+/, 'function'],           // M代码
      [/X\d+/, 'number'],            // X坐标
      [/Y\d+/, 'number'],            // Y坐标
      [/Z\d+/, 'number'],            // Z坐标
      [/F\d+/, 'number'],            // 进给速度
      [/S\d+/, 'number'],            // 主轴转速
    ]
  }
})
```

### 后端技术栈

#### Flask 应用结构
```python
# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# 蓝图注册
from controllers.template_controller import template_bp
from controllers.parameter_controller import parameter_bp
from controllers.editor_controller import editor_bp
from controllers.file_controller import file_bp

app.register_blueprint(template_bp, url_prefix='/api/templates')
app.register_blueprint(parameter_bp, url_prefix='/api/parameters')
app.register_blueprint(editor_bp, url_prefix='/api/editor')
app.register_blueprint(file_bp, url_prefix='/api/files')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
```

#### 服务层架构
```python
# services/template_service.py
class TemplateService:
    def __init__(self):
        self.template_manager = TemplateManager()
        self.file_manager = FileManager()
    
    async def get_all_packages(self) -> List[TemplatePackage]:
        """获取所有模板包"""
        return self.template_manager.scan_packages()
    
    async def get_package_by_id(self, package_id: str) -> TemplatePackage:
        """根据ID获取模板包"""
        return self.template_manager.get_package(package_id)
    
    async def import_package(self, file_data: bytes) -> TemplatePackage:
        """导入模板包"""
        # 保存临时文件
        temp_path = self.file_manager.save_temp_file(file_data)
        # 解压并验证
        package_path = self.template_manager.extract_package(temp_path)
        # 验证配置
        self.template_manager.validate_package(package_path)
        # 移动到packages目录
        final_path = self.template_manager.install_package(package_path)
        return TemplatePackage(final_path)

# services/parameter_service.py
class ParameterService:
    def __init__(self):
        self.validator = ParameterValidator()
    
    async def get_parameters(self, package_id: str) -> dict:
        """获取参数定义"""
        package = self.template_manager.get_package(package_id)
        return package.variables_config
    
    async def validate_parameters(self, package_id: str, parameters: dict) -> ValidationResult:
        """验证参数值"""
        config = await self.get_parameters(package_id)
        return self.validator.validate(parameters, config)
    
    async def calculate_derived_parameters(self, parameters: dict, config: dict) -> dict:
        """计算派生参数"""
        calculator = ParameterCalculator()
        return calculator.calculate(parameters, config)

# services/render_service.py
class RenderService:
    def __init__(self):
        self.render_engine = RenderEngine()
        self.parameter_service = ParameterService()
    
    async def render_package(self, package_id: str, parameters: dict) -> RenderResult:
        """渲染模板包"""
        # 验证参数
        validation = await self.parameter_service.validate_parameters(package_id, parameters)
        if validation.errors:
            raise ValidationError(validation.errors)
        
        # 计算派生参数
        config = await self.parameter_service.get_parameters(package_id)
        derived_params = await self.parameter_service.calculate_derived_parameters(parameters, config)
        all_params = {**parameters, **derived_params}
        
        # 渲染模板
        package = self.template_manager.get_package(package_id)
        return self.render_engine.render_package(package, all_params)
```

#### Jinja2 渲染引擎
```python
# utils/jinja_renderer.py
from jinja2 import Environment, FileSystemLoader
import math

class RenderEngine:
    def __init__(self):
        self.env = Environment(
            loader=FileSystemLoader('.'),
            extensions=['jinja2.ext.do'],
            autoescape=False,
            trim_blocks=True,
            lstrip_blocks=True
        )
        self._setup_filters()
        self._setup_globals()
    
    def render_package(self, package: TemplatePackage, parameters: dict) -> dict:
        """渲染模板包的所有输出文件"""
        results = {}
        outputs_config = package.outputs_config
        
        for output_name, output_config in outputs_config["files"].items():
            if not output_config.get("enabled", True):
                continue
            
            # 渲染模板
            template_path = package.path / output_config["template"]
            content = self._render_template(str(template_path), parameters)
            
            # 生成文件名
            filename = self._generate_filename(
                output_config["filename_pattern"],
                parameters
            )
            extension = output_config["extension"]
            
            results[output_name] = {
                "filename": filename + extension,
                "content": content,
                "description": output_config["description"]
            }
        
        return results
    
    def _render_template(self, template_path: str, parameters: dict) -> str:
        """渲染单个模板"""
        template = self.env.get_template(template_path)
        return template.render(**parameters)
    
    def _generate_filename(self, pattern: str, parameters: dict) -> str:
        """生成文件名"""
        template = self.env.from_string(pattern)
        return template.render(**parameters)
    
    def _setup_filters(self):
        """设置自定义过滤器"""
        self.env.filters['round'] = lambda x, digits=2: round(float(x), digits)
        self.env.filters['format'] = lambda x, fmt: format(x, fmt)
        self.env.filters['abs'] = abs
        self.env.filters['min'] = min
        self.env.filters['max'] = max
        self.env.filters['sin'] = lambda x: math.sin(math.radians(x))
        self.env.filters['cos'] = lambda x: math.cos(math.radians(x))
        self.env.filters['tan'] = lambda x: math.tan(math.radians(x))
        self.env.filters['sqrt'] = math.sqrt
    
    def _setup_globals(self):
        """设置全局函数"""
        self.env.globals['sin'] = lambda x: math.sin(math.radians(x))
        self.env.globals['cos'] = lambda x: math.cos(math.radians(x))
        self.env.globals['sqrt'] = math.sqrt
        self.env.globals['abs'] = abs
        self.env.globals['min'] = min
        self.env.globals['max'] = max
        self.env.globals['range'] = range
        self.env.globals['len'] = len
```

## 📋 项目边界和约束

### 功能边界
#### 包含的功能
- ✅ 模板包的完整生命周期管理
- ✅ 基于YAML的配置系统
- ✅ 强大的参数管理和验证
- ✅ 专业的代码编辑器
- ✅ 实时预览和渲染
- ✅ 多格式文件输出
- ✅ 文件管理和备份

#### 不包含的功能
- ❌ G代码语法验证和仿真
- ❌ 刀路轨迹计算和优化
- ❌ 机床后处理器
- ❌ CAD/CAM集成
- ❌ 网络协作和版本控制
- ❌ 数据库持久化（使用文件系统）
- ❌ 用户权限管理

### 技术约束
#### 必须使用的技术
- 前端：Vue.js 3 + TypeScript
- 后端：Python Flask
- 模板引擎：Jinja2
- 配置格式：YAML
- 编辑器：Monaco Editor

#### 文件格式约束
- 模板文件：必须使用.j2后缀
- 配置文件：必须使用package.yaml
- 导出格式：支持.nc, .mpf, .spf, .txt, .html

#### 接口约束
- 所有API必须使用RESTful风格
- 响应格式必须使用JSON
- 错误处理必须使用标准HTTP状态码

### 性能约束
- 模板包数量：支持最多1000个模板包
- 单个模板包大小：不超过10MB
- 渲染响应时间：单个文件渲染不超过2秒
- 并发用户：支持最多10个并发用户

### 兼容性约束
- 浏览器支持：Chrome 90+, Firefox 88+, Safari 14+
- Python版本：3.8+
- 操作系统：Windows 10+, macOS 10.15+, Linux (Ubuntu 18.04+)

## 🧪 测试策略

### 单元测试
- 前端组件测试：Vue Test Utils
- 后端服务测试：pytest
- 模板渲染测试：Jinja2模板测试
- 参数验证测试：边界值和异常情况测试

### 集成测试
- API接口测试：Postman/Newman
- 前后端集成测试：端到端测试
- 文件操作测试：文件上传下载测试

### 用户测试
- 界面可用性测试
- 工作流程测试
- 性能压力测试

## 📚 部署和维护

### 部署方案
- 开发环境：本地运行
- 测试环境：Docker容器
- 生产环境：单机部署

### 数据备份
- 模板包定期备份
- 配置文件版本控制
- 用户数据导出功能

### 维护计划
- 定期更新依赖库
- 性能监控和优化
- 用户反馈收集和处理

---

## 📝 文档约束说明

本文档作为项目的**唯一权威需求规范**，具有以下约束力：

### 开发约束
1. **功能范围**：所有开发功能必须严格在本文档定义的范围内
2. **技术选型**：必须使用本文档指定的技术栈和工具
3. **接口规范**：API接口必须符合本文档的定义
4. **数据格式**：所有数据格式必须遵循本文档的规范

### 变更管理
1. **需求变更**：任何需求变更必须先更新本文档
2. **设计变更**：设计变更不能超出本文档的范围
3. **实现变更**：代码实现不能偏离本文档的定义

### 验收标准
1. **功能验收**：以本文档的功能描述为验收标准
2. **质量验收**：以本文档的性能和兼容性约束为标准
3. **文档验收**：所有技术文档必须与本文档保持一致

### 违规处理
1. **超出范围**：任何超出本文档范围的功能都需要重新评估
2. **偏离规范**：代码实现偏离本文档规范必须修正
3. **文档过时**：本文档过时必须立即更新

**本文档版本：1.0.0**
**最后更新：2026-01-14**
**下次审查：2026-02-14**

---

*此文档为模板驱动的数控程序生成器项目的完整需求规范，所有开发活动必须严格遵循本文档的约束和定义。*
