# 约束执行机制 - 项目需求文档强制执行

## 🎯 约束目标

**确保任何代码实现都必须严格遵循PROJECT_REQUIREMENTS.md文档的约束和定义。如果后续需要修改需求，必须先更新PROJECT_REQUIREMENTS.md文档，然后再修改代码。**

## 🔒 执行机制

### 1. 文档版本控制机制

#### 文档版本追踪
```bash
# 每次修改需求文档时必须更新版本号
# 格式：主版本.次版本.修订版本
# 示例：1.0.0 -> 1.0.1 (需求小修改) -> 1.1.0 (功能新增) -> 2.0.0 (重大变更)
```

#### 文档完整性校验
```bash
# 创建文档校验脚本
./scripts/validate_document.sh
# 功能：检查PROJECT_REQUIREMENTS.md是否存在、格式是否正确、版本是否更新
```

### 2. 代码修改前强制检查

#### 修改前检查清单
```bash
# 每次代码修改前必须执行
./scripts/pre_commit_check.sh
# 检查内容：
# 1. 当前代码是否与PROJECT_REQUIREMENTS.md一致
# 2. 修改内容是否超出文档定义范围
# 3. 是否有需求变更但未更新文档
```

#### 约束违规检测
```bash
# 检测代码是否超出文档约束
./scripts/constraint_violation_check.sh
# 检测项目：
# - 功能范围违规
# - 技术栈违规  
# - 接口定义违规
# - 数据格式违规
```

### 3. 文档优先原则

#### 需求变更流程
```
1. 发现需求变更需求
   ↓
2. 必须先更新PROJECT_REQUIREMENTS.md
   ↓
3. 更新文档版本号
   ↓
4. 执行文档校验脚本
   ↓
5. 然后才能修改代码
   ↓
6. 代码必须符合新文档要求
```

#### 代码实现原则
```
1. 严格按照PROJECT_REQUIREMENTS.md实现
2. 任何超出文档的功能都是违规
3. 文档未定义的技术选择都是违规
4. 接口和数据格式必须与文档一致
```

## 🛠️ 实施工具

### 1. 文档校验脚本
```bash
#!/bin/bash
# scripts/validate_document.sh

echo "🔍 校验PROJECT_REQUIREMENTS.md文档..."

# 检查文件是否存在
if [ ! -f "PROJECT_REQUIREMENTS.md" ]; then
    echo "❌ 错误：PROJECT_REQUIREMENTS.md文档不存在！"
    exit 1
fi

# 检查文档版本
VERSION=$(grep "本文档版本：" PROJECT_REQUIREMENTS.md | cut -d'：' -f2 | tr -d ' ')
echo "📄 当前文档版本：$VERSION"

# 检查必要章节
REQUIRED_SECTIONS=(
    "项目概述"
    "系统架构" 
    "模块设计"
    "模板包规范"
    "项目边界和约束"
    "文档约束说明"
)

for section in "${REQUIRED_SECTIONS[@]}"; do
    if ! grep -q "$section" PROJECT_REQUIREMENTS.md; then
        echo "❌ 错误：文档缺少必要章节：$section"
        exit 1
    fi
done

echo "✅ 文档校验通过"
exit 0
```

### 2. 约束检查脚本
```bash
#!/bin/bash
# scripts/constraint_check.sh

echo "🔒 检查代码是否遵循PROJECT_REQUIREMENTS.md约束..."

# 1. 检查技术栈违规
echo "🔍 检查技术栈..."
if [ -f "package.json" ]; then
    # 检查是否使用Vue.js 3
    if ! grep -q "vue.*3" package.json; then
        echo "❌ 技术栈违规：必须使用Vue.js 3"
        exit 1
    fi
fi

if [ -f "requirements.txt" ]; then
    # 检查是否使用Flask
    if ! grep -q "Flask" requirements.txt; then
        echo "❌ 技术栈违规：必须使用Flask"
        exit 1
    fi
fi

# 2. 检查文件格式违规
echo "🔍 检查文件格式..."
if find . -name "*.json" -path "*/templates/*" | grep -q .; then
    echo "❌ 文件格式违规：模板文件必须使用.j2后缀"
    exit 1
fi

# 3. 检查功能范围违规
echo "🔍 检查功能范围..."
FORBIDDEN_PATTERNS=(
    "database\|mysql\|postgresql"  # 数据库相关
    "user.*auth\|permission"       # 用户权限相关
    "cad\|cam\|simulation"         # CAD/CAM仿真相关
)

for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
    if grep -r -i "$pattern" --include="*.py" --include="*.js" --include="*.vue" . | grep -v "scripts/" | grep -q .; then
        echo "❌ 功能范围违规：检测到禁止的功能：$pattern"
        exit 1
    fi
done

echo "✅ 约束检查通过"
exit 0
```

### 3. 预提交检查脚本
```bash
#!/bin/bash
# scripts/pre_commit_check.sh

echo "🚀 执行代码修改前强制检查..."

# 1. 文档校验
echo "📄 步骤1：校验需求文档..."
./scripts/validate_document.sh
if [ $? -ne 0 ]; then
    echo "❌ 文档校验失败，不能继续代码修改！"
    exit 1
fi

# 2. 约束检查  
echo "🔒 步骤2：检查代码约束..."
./scripts/constraint_check.sh
if [ $? -ne 0 ]; then
    echo "❌ 约束检查失败，不能继续代码修改！"
    exit 1
fi

# 3. 检查是否有未文档化的变更
echo "🔍 步骤3：检查未文档化的变更..."
if git status --porcelain | grep -q "M"; then
    echo "⚠️  检测到代码修改，请确认："
    echo "   - 如果是需求变更，请先更新PROJECT_REQUIREMENTS.md"
    echo "   - 如果是代码实现，请确认符合文档要求"
    echo "   - 输入 'continue' 继续，其他取消"
    read -r confirmation
    if [ "$confirmation" != "continue" ]; then
        echo "❌ 用户取消操作"
        exit 1
    fi
fi

echo "✅ 所有检查通过，可以开始代码修改"
exit 0
```

## 📋 强制执行流程

### 日常开发流程
```bash
# 每次开始开发前
source scripts/pre_commit_check.sh

# 每次提交代码前
git add .
./scripts/pre_commit_check.sh
git commit -m "feat: 符合PROJECT_REQUIREMENTS.md的功能实现"
```

### 需求变更流程
```bash
# 1. 修改需求文档
vim PROJECT_REQUIREMENTS.md

# 2. 更新文档版本号
# 在文档中更新"本文档版本：x.x.x"

# 3. 执行文档校验
./scripts/validate_document.sh

# 4. 然后才能修改代码
./scripts/constraint_check.sh
```

## 🔍 监控机制

### 自动监控
```bash
# 添加到package.json或Makefile中
"scripts": {
    "pre-commit": "./scripts/pre_commit_check.sh",
    "validate-doc": "./scripts/validate_document.sh", 
    "check-constraints": "./scripts/constraint_check.sh"
}
```

### 持续检查
```bash
# 创建定时检查任务（可选）
# 每小时检查一次代码是否违反约束
*/ * * * * cd /path/to/project && ./scripts/constraint_check.sh
```

## ⚠️ 违规处理

### 违规等级
1. **严重违规**：超出功能范围、使用禁止技术
2. **一般违规**：接口定义不符、数据格式错误
3. **轻微违规**：代码风格不符、命名不规范

### 处理措施
1. **严重违规**：立即停止开发，回滚代码，重新审查需求
2. **一般违规**：修正代码，更新文档，重新检查
3. **轻微违规**：记录违规，下次修正

### 违规记录
```bash
# 创建违规记录文件
echo "$(date): 违规类型 - 违规描述 - 处理措施" >> VIOLATION_LOG.txt
```

## 🔄 持久化机制

### 项目启动检查
```bash
# 在项目根目录创建启动脚本
#!/bin/bash
# start.sh
echo "🚀 启动项目..."
echo "🔍 检查约束执行机制..."

# 检查必要脚本是否存在
REQUIRED_SCRIPTS=(
    "scripts/validate_document.sh"
    "scripts/constraint_check.sh" 
    "scripts/pre_commit_check.sh"
)

for script in "${REQUIRED_SCRIPTS[@]}"; do
    if [ ! -f "$script" ]; then
        echo "❌ 缺少必要脚本：$script"
        echo "请重新创建约束执行机制"
        exit 1
    fi
done

# 执行约束检查
./scripts/pre_commit_check.sh

echo "✅ 项目启动完成，约束机制已激活"
```

### 重启后恢复
```bash
# 创建恢复脚本
#!/bin/bash
# restore_constraints.sh
echo "🔄 恢复约束执行机制..."

# 检查PROJECT_REQUIREMENTS.md
if [ ! -f "PROJECT_REQUIREMENTS.md" ]; then
    echo "❌ 缺少PROJECT_REQUIREMENTS.md文档"
    echo "约束机制无法恢复"
    exit 1
fi

# 重新创建必要脚本
# ... 脚本创建逻辑 ...

echo "✅ 约束执行机制已恢复"
```

## 📝 约束声明

### 在所有代码文件中添加约束声明
```python
# 所有Python文件头部添加
"""
此文件必须严格遵循PROJECT_REQUIREMENTS.md文档约束。
任何修改都必须先更新需求文档，然后修改代码。
违反此约束将导致代码被拒绝。
"""

# 所有JavaScript/Vue文件头部添加  
/**
 * 此文件必须严格遵循PROJECT_REQUIREMENTS.md文档约束。
 * 任何修改都必须先更新需求文档，然后修改代码。
 * 违反此约束将导致代码被拒绝。
 */
```

### 在README.md中添加约束说明
```markdown
## 🚨 重要约束

**本项目严格遵循PROJECT_REQUIREMENTS.md文档定义。**

- 任何代码修改都必须符合文档约束
- 任何需求变更都必须先更新文档
- 违反约束的代码将被拒绝

执行检查：`./scripts/pre_commit_check.sh`
```

---

**约束执行机制版本：1.0.0**
**创建时间：2026-01-14**
**强制执行：是**

*此机制确保项目需求文档的绝对权威性，任何违反约束的行为都将被阻止。*
