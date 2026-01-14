# AGENTS.md - 代理编码指南

此文件为在此仓库中工作的AI代理编码助手提供指导原则和最佳实践。

## 🚀 构建/测试/代码检查命令

### 通用命令
```bash
# 查看项目状态
git status

# 安装依赖（根据项目类型选择）
npm install          # Node.js/JavaScript
pip install -r requirements.txt  # Python
cargo build          # Rust
go mod tidy         # Go
```

### 测试命令
```bash
# 运行所有测试
npm test            # Node.js
pytest             # Python
cargo test          # Rust
go test ./...       # Go

# 运行单个测试文件
npm test -- path/to/test/file.js
pytest path/to/test/file.py
cargo test --lib test_name
go test ./path/to/package

# 运行特定测试用例
npm test -- --grep "test description"
pytest -k "test_function_name"
cargo test test_name
go test -run TestFunctionName
```

### 代码检查和格式化
```bash
# 代码检查
npm run lint        # Node.js
flake8 .           # Python
cargo clippy        # Rust
gofmt -s .         # Go

# 代码格式化
npm run format     # Node.js
black .            # Python
cargo fmt          # Rust
gofmt -w .         # Go
```

## 📝 代码风格指南

### 导入语句规范
```javascript
// JavaScript/TypeScript - 按类型分组
// 1. Node.js 内置模块
import fs from 'fs';
import path from 'path';

// 2. 第三方库
import express from 'express';
import lodash from 'lodash';

// 3. 本地模块
import { utils } from '../helpers/utils';
import { UserService } from '../services/UserService';
```

```python
# Python - 按PEP8标准
# 1. 标准库
import os
import sys
from typing import List, Optional

# 2. 第三方库
import requests
import pandas as pd

# 3. 本地模块
from .utils import helper_function
from .models import User
```

### 命名约定
```javascript
// 变量和函数：camelCase
const userName = 'john';
const getUserData = () => {};

// 常量：UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.example.com';

// 类和组件：PascalCase
class UserService {}
class UserProfile extends React.Component {}

// 文件名：kebab-case
// user-service.js
// user-profile.component.tsx
```

```python
# Python - PEP8标准
# 变量和函数：snake_case
user_name = 'john'
def get_user_data():
    pass

# 常量：UPPER_SNAKE_CASE
MAX_RETRY_COUNT = 3
API_BASE_URL = 'https://api.example.com'

# 类：PascalCase
class UserService:
    pass

# 文件名：snake_case
# user_service.py
# user_profile.py
```

### 类型定义和注解
```typescript
// TypeScript - 明确的类型定义
interface User {
    id: number;
    name: string;
    email: string;
    createdAt: Date;
}

type ApiResponse<T> = {
    data: T;
    status: number;
    message?: string;
};

// 函数类型注解
const createUser = async (userData: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
    // 实现
};
```

```python
# Python - 类型注解
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from datetime import datetime

@dataclass
class User:
    id: int
    name: str
    email: str
    created_at: datetime

# 函数类型注解
async def create_user(user_data: Dict[str, Any]) -> User:
    # 实现
    pass
```

### 错误处理模式
```javascript
// JavaScript/TypeScript - 统一错误处理
class ApiError extends Error {
    constructor(
        public status: number,
        message: string,
        public code?: string
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

// 异步函数错误处理
const fetchUser = async (id: number): Promise<User> => {
    try {
        const response = await api.get(`/users/${id}`);
        return response.data;
    } catch (error) {
        if (error instanceof ApiError) {
            logger.error('API错误:', error.message);
            throw error;
        }
        logger.error('未知错误:', error);
        throw new ApiError(500, '获取用户信息失败');
    }
};
```

```python
# Python - 异常处理
class ApiError(Exception):
    def __init__(self, status: int, message: str, code: str = None):
        self.status = status
        self.message = message
        self.code = code
        super().__init__(message)

# 异步函数错误处理
async def fetch_user(user_id: int) -> User:
    try:
        response = await api.get(f"/users/{user_id}")
        return response.data
    except ApiError as e:
        logger.error(f"API错误: {e.message}")
        raise
    except Exception as e:
        logger.error(f"未知错误: {e}")
        raise ApiError(500, "获取用户信息失败")
```

## 🎯 代理工作流程

### 1. 代码分析阶段
- 首先理解现有代码结构和模式
- 查找相关的测试文件和文档
- 识别项目使用的技术栈和框架

### 2. 实现阶段
- 遵循现有的代码风格和模式
- 编写清晰、可读的代码
- 添加适当的注释和文档

### 3. 测试阶段
- 编写或更新相关测试
- 确保测试覆盖新功能
- 运行测试验证功能正确性

### 4. 代码质量检查
- 运行代码检查工具
- 修复任何警告或错误
- 确保代码符合项目标准

## 📋 提交规范

### 提交消息格式
```
<类型>(<范围>): <描述>

[可选的正文]

[可选的脚注]
```

### 类型说明
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式化
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

### 示例
```
feat(auth): 添加用户登录功能

- 实现JWT认证
- 添加登录表单验证
- 更新用户服务

Closes #123
```

## 🔧 开发环境设置

### 必需工具
- Git
- 适当的运行时环境（Node.js, Python, Rust, Go等）
- 代码编辑器（推荐VS Code）

### 推荐扩展
- 代码格式化工具
- 代码检查工具
- 智能代码补全
- Git集成

## 📚 资源链接

- [项目文档](./docs/README.md)
- [API参考](./docs/api.md)
- [贡献指南](./CONTRIBUTING.md)

---

**注意**: 此文件应根据项目的具体需求和技术栈进行更新和调整。
