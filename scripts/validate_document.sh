#!/bin/bash

echo "🔍 校验PROJECT_REQUIREMENTS.md文档..."

# 检查文件是否存在
if [ ! -f "PROJECT_REQUIREMENTS.md" ]; then
    echo "❌ 错误：PROJECT_REQUIREMENTS.md文档不存在！"
    echo "请确保项目需求文档存在且可访问。"
    exit 1
fi

# 检查文档版本
VERSION=$(grep "本文档版本：" PROJECT_REQUIREMENTS.md | sed 's/.*\*\*\(.*\)\*\*.*/\1/')
if [ -z "$VERSION" ]; then
    echo "❌ 错误：文档缺少版本号！"
    echo "请在文档中添加'本文档版本：x.x.x'"
    exit 1
fi

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
        echo "请确保文档包含所有必要章节。"
        exit 1
    fi
done

# 检查文档完整性
DOC_LINES=$(wc -l < PROJECT_REQUIREMENTS.md)
if [ "$DOC_LINES" -lt 500 ]; then
    echo "⚠️  警告：文档行数过少（$DOC_LINES行），可能内容不完整"
fi

# 检查约束条款
if ! grep -q "约束力" PROJECT_REQUIREMENTS.md; then
    echo "❌ 错误：文档缺少约束力条款！"
    echo "请确保文档包含'文档约束说明'章节。"
    exit 1
fi

echo "✅ 文档校验通过"
echo "📋 文档版本：$VERSION"
echo "📄 文档行数：$DOC_LINES行"
exit 0
