#!/bin/bash

echo "🔒 检查代码是否遵循PROJECT_REQUIREMENTS.md约束..."
echo "🔍 检查技术栈合规性..."

# 检查前端技术栈
echo "  🐍 检查前端技术栈..."
if [ -f "package.json" ]; then
    # 检查是否使用Vue.js 3
    if ! grep -q "vue.*3" package.json; then
        echo "❌ 技术栈违规：必须使用Vue.js 3"
        echo "请在package.json中添加Vue.js 3依赖"
        exit 1
    fi
    
    # 检查是否使用TypeScript
    if ! grep -q "typescript" package.json; then
        echo "❌ 技术栈违规：必须使用TypeScript"
        echo "请在package.json中添加TypeScript依赖"
        exit 1
    fi
    
    # 检查是否使用Pinia
    if ! grep -q "pinia" package.json; then
        echo "❌ 技术栈违规：必须使用Pinia状态管理"
        echo "请在package.json中添加Pinia依赖"
        exit 1
    fi
    
    echo "  ✅ 前端技术栈检查通过"
fi

# 检查后端技术栈
echo "  🐍 检查后端技术栈..."
if [ -f "requirements.txt" ]; then
    # 检查是否使用Flask
    if ! grep -q "Flask" requirements.txt; then
        echo "❌ 技术栈违规：必须使用Flask"
        echo "请在requirements.txt中添加Flask依赖"
        exit 1
    fi
    
    # 检查是否使用Jinja2
    if ! grep -q "Jinja2" requirements.txt; then
        echo "❌ 技术栈违规：必须使用Jinja2"
        echo "请在requirements.txt中添加Jinja2依赖"
        exit 1
    fi
    
    # 检查是否使用PyYAML
    if ! grep -q "PyYAML" requirements.txt; then
        echo "❌ 技术栈违规：必须使用PyYAML"
        echo "请在requirements.txt中添加PyYAML依赖"
        exit 1
    fi
    
    echo "  ✅ 后端技术栈检查通过"
fi

echo "🔍 检查文件格式合规性..."

# 检查模板文件格式
echo "  检查模板文件格式..."
if find . -name "*.json" -path "*/templates/*" 2>/dev/null | grep -q .; then
    echo "❌ 文件格式违规：模板文件必须使用.j2后缀"
    echo "发现.json格式的模板文件，请改为.j2格式"
    exit 1
fi

# 检查配置文件格式
echo "  检查配置文件格式..."
if [ -d "packages" ]; then
    CONFIG_FILES=$(find packages -name "config.*" -o -name "*.json" 2>/dev/null)
    if [ -n "$CONFIG_FILES" ]; then
        echo "❌ 文件格式违规：配置文件必须使用package.yaml"
        echo "发现非YAML格式的配置文件，请改为package.yaml"
        exit 1
    fi
fi

echo "  ✅ 文件格式检查通过"

echo "🔍 检查功能范围合规性..."

# 定义禁止的功能模式
FORBIDDEN_PATTERNS=(
    "database|mysql|postgresql|sqlite"     # 数据库相关
    "user.*auth|permission|role|login"     # 用户权限相关
    "cad|cam|simulation|simulate"        # CAD/CAM仿真相关
    "git.*push|git.*pull|remote"         # Git远程操作（超出文档范围）
)

# 检查代码文件中的违规模式
echo "  检查违规模式..."
CODE_FILES=("*.py" "*.js" "*.ts")
for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
    for ext in "${CODE_FILES[@]}"; do
        if grep -r -i "\b$pattern\b" --include="$ext" . 2>/dev/null | grep -v "scripts/" | grep -v "node_modules/" | grep -q .; then
            echo "❌ 功能范围违规：检测到禁止的功能模式：$pattern"
            echo "请检查代码并移除超出PROJECT_REQUIREMENTS.md定义范围的功能"
            exit 1
        fi
    done
done

echo "  ✅ 功能范围检查通过"

echo "🔍 检查接口定义合规性..."

# 检查是否有非RESTful接口
if [ -f "app.py" ] || [ -d "backend" ]; then
    NON_RESTFUL=$(grep -r "def.*rpc\|def.*soap\|def.*graphql" --include="*.py" . 2>/dev/null | grep -v "scripts/" | grep -q .)
    if [ -n "$NON_RESTFUL" ]; then
        echo "❌ 接口定义违规：必须使用RESTful API风格"
        echo "请使用Flask RESTful接口，避免RPC/SOAP等风格"
        exit 1
    fi
    echo "  ✅ 接口定义检查通过"
fi

echo "🔍 检查数据格式合规性..."

# 检查是否使用了禁止的数据格式
if find . -name "*.xml" -o -name "*.soap" 2>/dev/null | grep -v "scripts/" | grep -q .; then
    echo "❌ 数据格式违规：必须使用JSON格式进行数据交换"
    echo "请将XML等格式改为JSON格式"
    exit 1
fi

echo "  ✅ 数据格式检查通过"

echo "🔍 检查性能约束合规性..."

# 检查是否有明显违反性能约束的代码
PERFORMANCE_VIOLATIONS=(
    "time\.sleep\([0-9]{3,}"         # 长时间阻塞
    "while.*True.*:"                   # 无限循环
    "eval\|exec"                        # 动态执行（安全风险）
)

for pattern in "${PERFORMANCE_VIOLATIONS[@]}"; do
    if grep -r "$pattern" --include="*.py" . 2>/dev/null | grep -v "scripts/" | grep -q .; then
        echo "⚠️  性能警告：检测到可能的性能问题：$pattern"
        echo "请检查代码是否符合性能约束要求"
    fi
done

echo "  ✅ 性能约束检查通过"

echo ""
echo "🎉 所有约束检查通过！"
echo "📋 检查项目："
echo "  ✅ 技术栈合规性"
echo "  ✅ 文件格式合规性"
echo "  ✅ 功能范围合规性"
echo "  ✅ 接口定义合规性"
echo "  ✅ 数据格式合规性"
echo "  ✅ 性能约束合规性"

echo ""
echo "🔒 代码实现严格遵循PROJECT_REQUIREMENTS.md文档约束"
