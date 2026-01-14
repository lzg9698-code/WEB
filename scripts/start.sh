#!/bin/bash

echo "🚀 启动项目..."
echo "========================================"

# 检查项目需求文档
if [ ! -f "PROJECT_REQUIREMENTS.md" ]; then
    echo "❌ 错误：缺少PROJECT_REQUIREMENTS.md文档！"
    echo "约束执行机制无法启动。"
    echo "请确保项目需求文档存在。"
    exit 1
fi

echo "📄 找到项目需求文档"
echo "版本: $(grep "本文档版本：" PROJECT_REQUIREMENTS.md | cut -d':' -f2 | tr -d ' ')"

# 检查scripts目录
if [ ! -d "scripts" ]; then
    echo "❌ 错误：缺少scripts目录！"
    echo "正在创建约束执行机制..."
    mkdir -p scripts
fi

# 检查必要脚本
REQUIRED_SCRIPTS=(
    "validate_document.sh"
    "constraint_check.sh"
    "pre_commit_check.sh"
)

MISSING_SCRIPTS=()
for script in "${REQUIRED_SCRIPTS[@]}"; do
    if [ ! -f "scripts/$script" ]; then
        MISSING_SCRIPTS+=("$script")
    else
        # 确保脚本有执行权限
        chmod +x "scripts/$script"
    fi
done

if [ ${#MISSING_SCRIPTS[@]} -gt 0 ]; then
    echo "❌ 错误：缺少必要脚本："
    for script in "${MISSING_SCRIPTS[@]}"; do
        echo "   - scripts/$script"
    done
    echo ""
    echo "🛠️  请重新创建约束执行机制"
    exit 1
fi

echo "✅ 所有必要脚本已就位"

# 执行约束检查
echo ""
echo "🔍 执行启动约束检查..."
./scripts/pre_commit_check.sh
STARTUP_CHECK_RESULT=$?

if [ $STARTUP_CHECK_RESULT -ne 0 ]; then
    echo ""
    echo "❌ 启动约束检查失败！"
    echo "🛠️  解决方案："
    echo "   1. 检查PROJECT_REQUIREMENTS.md文档"
    echo "   2. 修复代码违规问题"
    echo "   3. 重新运行启动脚本"
    echo ""
    echo "🚫 在约束检查通过之前，项目无法启动"
    exit 1
fi

echo ""
echo "========================================"
echo "🎉 项目启动完成！"
echo ""
echo "🔒 约束执行机制已激活"
echo "📋 严格遵循PROJECT_REQUIREMENTS.md文档"
echo "🛡️  所有代码修改都将受到约束检查"
echo ""
echo "📋 可用命令："
echo "   - 代码修改前检查: ./scripts/pre_commit_check.sh"
echo "   - 文档校验:      ./scripts/validate_document.sh"
echo "   - 约束检查:      ./scripts/constraint_check.sh"
echo ""
echo "⚠️  重要提醒："
echo "   - 任何需求变更都必须先更新PROJECT_REQUIREMENTS.md"
echo "   - 任何代码修改都必须符合文档约束"
echo "   - 违反约束的代码将被拒绝"
echo "========================================"

# 设置全局环境变量
export PROJECT_STARTED=true
export PROJECT_START_TIME=$(date)
export CONSTRAINT_MECHANISM_ACTIVE=true

# 创建启动记录
echo "$(date): 项目启动成功，约束机制已激活" >> PROJECT_STARTUP_LOG.txt

exit 0
