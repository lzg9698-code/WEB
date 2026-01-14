# 模板驱动的数控程序生成器

## 🚨 重要约束声明

**本项目严格遵循 `PROJECT_REQUIREMENTS.md` 文档定义。**

### 📋 核心约束原则
1. **文档优先**：任何代码修改都必须符合PROJECT_REQUIREMENTS.md文档
2. **变更流程**：需求变更必须先更新文档，再修改代码
3. **技术栈固定**：必须使用文档中指定的技术栈
4. **功能范围限制**：严禁实现超出文档定义的功能
5. **接口规范**：API接口必须符合文档定义

---

## 🎯 项目概述

本项目是一个**模板驱动的数控程序生成器**，主要功能包括：

- 📦 **模板包管理**：导入、导出、管理数控程序模板包
- ⚙️ **参数管理**：强大的参数系统，支持验证、计算和预设
- 📝 **编辑器**：专业的模板和配置编辑器
- 🎨 **渲染引擎**：基于Jinja2的模板渲染系统
- 📁 **文件管理**：完整的文件组织和备份机制

## 🏗️ 技术架构

- **前端**：Vue.js 3 + TypeScript + Pinia
- **后端**：Python Flask + Jinja2 + PyYAML
- **编辑器**：Monaco Editor (VS Code同款)
- **配置**：YAML格式
- **模板**：Jinja2模板引擎

---

## 📋 快速开始

### 前置要求
- Python 3.8+
- Node.js 16+
- 现代浏览器

### Docker部署（推荐）

```bash
# 1. 克隆项目
git clone <repository-url>
cd mytool

# 2. 构建并启动容器
docker-compose up -d

# 3. 访问应用
# 前端: http://localhost:5173
# 后端API: http://localhost:5000
```

### 本地开发

```bash
# 1. 克隆项目
git clone <repository-url>
cd mytool

# 2. 激活约束机制
source .bashrc_constraint

# 3. 安装后端依赖
pip install -r requirements.txt

# 4. 安装前端依赖
npm install

# 5. 启动开发服务器
npm run dev
```

### 生产部署

```bash
# 1. 构建前端
npm run build

# 2. 使用Docker构建
docker build -t nc-program-generator .
docker run -d -p 5000:5000 -v ./templates:/home/lzg9698/my_project/mytool/templates nc-program-generator
```

---

## 📁 项目结构

```
mytool/
├── backend/                 # 后端代码
│   ├── controllers/         # API控制器
│   │   ├── template_controller.py
│   │   ├── parameter_controller.py
│   │   └── render_controller.py
│   ├── services/            # 业务逻辑层
│   ├── models/              # 数据模型
│   └── utils/               # 工具函数
├── src/                     # 前端代码
│   ├── components/          # Vue组件
│   │   ├── TemplateManager/ # 模板管理模块
│   │   ├── ParameterManager/# 参数管理模块
│   │   ├── Editor/          # 编辑器模块
│   │   ├── Render/          # 渲染引擎模块
│   │   ├── FileManager/     # 文件管理模块
│   │   ├── Layout/          # 布局组件
│   │   └── Common/          # 通用组件
│   ├── stores/              # Pinia状态管理
│   │   ├── templateManagerStore.ts
│   │   ├── parameterManagerStore.ts
│   │   ├── renderStore.ts
│   │   └── fileManagerStore.ts
│   ├── services/            # API服务
│   └── styles/              # 样式文件
├── templates/               # 模板文件目录
├── output/                  # 输出文件目录
├── logs/                    # 日志文件目录
├── Dockerfile               # Docker配置
├── docker-compose.yml       # Docker Compose配置
├── requirements.txt         # Python依赖
└── package.json             # Node依赖
```

---

## 🔌 API接口文档

### 基础信息
- **基础URL**: `http://localhost:5000/api`
- **响应格式**: JSON
- **认证方式**: 无

### 模板管理接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/templates` | 获取模板列表 |
| GET | `/api/templates/{name}` | 获取模板详情 |
| POST | `/api/templates` | 导入模板包 |
| POST | `/api/templates/{name}/validate` | 验证模板 |
| POST | `/api/templates/{name}/render` | 渲染模板 |
| DELETE | `/api/templates/{name}` | 删除模板 |

### 参数管理接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/parameters` | 获取参数列表 |
| POST | `/api/parameters` | 创建参数 |
| PUT | `/api/parameters/{id}` | 更新参数 |
| DELETE | `/api/parameters/{id}` | 删除参数 |
| POST | `/api/parameters/validate` | 验证参数 |

### 渲染引擎接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/templates/{name}/render` | 渲染模板 |
| POST | `/api/preview/{name}` | 预览渲染 |
| POST | `/api/templates/{name}/validate` | 验证模板 |

### 文件管理接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/files` | 获取文件列表 |
| POST | `/api/files/create` | 创建文件/文件夹 |
| POST | `/api/files/delete` | 删除文件 |
| POST | `/api/files/rename` | 重命名文件 |
| POST | `/api/files/copy` | 复制文件 |
| POST | `/api/files/upload` | 上传文件 |
| GET | `/api/files/download` | 下载文件 |
| POST | `/api/files/search` | 搜索文件 |

### 健康检查

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/info` | 应用信息 |

---

## 📖 使用指南

### 1. 创建模板包

```yaml
# package.yaml
name: example_template
version: 1.0.0
description: 示例模板包
author: Developer
outputs:
  - filename: "program_{{ program_name }}.nc"
    template: "main.j2"
    description: 主程序文件
parameters:
  - name: program_name
    type: string
    required: true
  - name: feed_rate
    type: number
    required: true
    min: 0
    max: 5000
```

### 2. 编写Jinja2模板

```jinja2
{# main.j2 - 主程序模板 #}
O{{ program_number }} ({{ program_name }})

(Feed rate: {{ feed_rate }})
(Max spindle: {{ spindle_speed }})

G90 G54 G17
M06 T{{ tool_number }}
M03 S{{ spindle_speed }}
G00 X{{ start_x }} Y{{ start_y }}
G43 Z{{ safe_height }} H{{ tool_length }}
{% for move in rapid_moves %}
G00 X{{ move.x }} Y{{ move.y }}
{% endfor %}
M05
M30
%
```

### 3. 渲染模板

```python
import requests

response = requests.post(
    'http://localhost:5000/api/templates/example_template/render',
    json={
        'parameters': {
            'program_name': 'part_001',
            'feed_rate': 1500,
            'spindle_speed': 3000,
            'tool_number': 1,
            'start_x': 0,
            'start_y': 0,
            'safe_height': 10,
            'rapid_moves': [
                {'x': 10, 'y': 10},
                {'x': 20, 'y': 20}
            ]
        }
    }
)

result = response.json()
print(result['files'])
```

---

## 🐳 Docker使用

### 开发环境

```bash
# 启动开发环境
docker-compose up dev

# 查看日志
docker-compose logs -f dev
```

### 生产环境

```bash
# 构建镜像
docker-compose build app

# 启动服务
docker-compose up -d app

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f app

# 停止服务
docker-compose down
```

### 数据持久化

```yaml
# 挂载目录说明
- ./templates:/home/lzg9698/my_project/mytool/templates   # 模板文件
- ./output:/home/lzg9698/my_project/mytool/output         # 输出文件
- ./logs:/home/lzg9698/my_project/mytool/logs             # 日志文件
```

---

## 🔧 配置选项

### 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| FLASK_APP | Flask应用入口 | app.py |
| FLASK_ENV | 运行环境 | production |
| SECRET_KEY | 密钥 | auto-generated |

### 模板配置

在 `templates/` 目录下创建模板包，每个模板包包含：
- `package.yaml`: 模板包配置
- `*.j2`: Jinja2模板文件
- `config/`: 配置文件目录

---

## 📝 约束声明

本项目严格遵循 `PROJECT_REQUIREMENTS.md` 文档定义：

1. **禁止功能**: 不实现用户认证、数据库、CAD/CAM功能
2. **技术栈**: 强制使用 Vue.js 3 + Flask + Jinja2 + PyYAML + Monaco Editor
3. **代码规范**: 遵循项目AGENTS.md中的编码规范

---

## 📚 文档链接

- [详细需求文档](./PROJECT_REQUIREMENTS.md)
- [约束执行机制](./CONSTRAINT_ENFORCEMENT.md)
- [编码规范](./AGENTS.md)

---

## 📄 许可证

MIT License

---

**版本**: 1.0.0  
**最后更新**: 2026-01-14  
**约束状态**: 🔒 激活

**⚠️ 重要提醒：任何代码修改都必须严格遵循PROJECT_REQUIREMENTS.md文档约束！**
