#!/bin/bash

echo "========================================"
echo "   系统完整性测试"
echo "========================================"
echo ""

# 1. 测试后端
echo "1. 测试后端服务..."
BACKEND_STATUS=$(curl -s http://localhost:5000/api/health 2>/dev/null | grep -c "healthy")
if [ "$BACKEND_STATUS" -gt 0 ]; then
    echo "   ✅ 后端运行正常"
else
    echo "   ❌ 后端未运行或出错"
fi

# 2. 测试模板API
echo ""
echo "2. 测试模板API..."
TEMPLATE_COUNT=$(curl -s http://localhost:5000/api/templates/ 2>/dev/null | grep -c "success")
if [ "$TEMPLATE_COUNT" -gt 0 ]; then
    echo "   ✅ 模板API正常"
else
    echo "   ❌ 模板API无响应"
fi

# 3. 测试前端进程
echo ""
echo "3. 测试前端进程..."
VITE_RUNNING=$(ps aux | grep "node.*vite" | grep -v grep | wc -l)
if [ "$VITE_RUNNING" -gt 0 ]; then
    echo "   ✅ 前端进程运行中"
else
    echo "   ❌ 前端进程未运行"
fi

# 4. 测试前端响应
echo ""
echo "4. 测试前端响应..."
FRONTEND_RESPONSE=$(curl -s "http://localhost:3000/src/App.vue" 2>/dev/null | wc -c)
if [ "$FRONTEND_RESPONSE" -gt 1000 ]; then
    echo "   ✅ 前端响应正常 ($FRONTEND_RESPONSE bytes)"
else
    echo "   ❌ 前端响应异常 ($FRONTEND_RESPONSE bytes)"
fi

# 5. 检查编译后的代码
echo ""
echo "5. 检查编译后的关键函数..."
PREVIEW_FUNC=$(curl -s "http://localhost:3000/src/App.vue" 2>/dev/null | grep -c "generatePreview")
EXPORT_FUNC=$(curl -s "http://localhost:3000/src/App.vue" 2>/dev/null | grep -c "exportRender")
RENDER_STORE=$(curl -s "http://localhost:3000/src/stores/renderStore.ts" 2>/dev/null | grep -c "useRenderStore")
RENDER_API=$(curl -s "http://localhost:3000/src/services/api.ts" 2>/dev/null | grep -c "renderApi.export")

echo "   generatePreview 函数: $([ "$PREVIEW_FUNC" -gt 0 ] && echo '✅' || echo '❌')"
echo "   exportRender 函数: $([ "$EXPORT_FUNC" -gt 0 ] && echo '✅' || echo '❌')"
echo "   useRenderStore 导入: $([ "$RENDER_STORE" -gt 0 ] && echo '✅' || echo '❌')"
echo "   renderApi.export 导入: $([ "$RENDER_API" -gt 0 ] && echo '✅' || echo '❌')"

# 6. 检查文件完整性
echo ""
echo "6. 检查关键文件..."
FILES=(
    "/home/lzg9698/my_project/mytool/src/App.vue"
    "/home/lzg9698/my_project/mytool/src/stores/renderStore.ts"
    "/home/lzg9698/my_project/mytool/src/services/api.ts"
    "/home/lzg9698/my_project/mytool/src/components/Render/RenderPreview.vue"
    "/home/lzg9698/my_project/mytool/src/components/Render/index.ts"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file")
        echo "   ✅ $(basename $file): $lines 行"
    else
        echo "   ❌ $(basename $file): 文件不存在"
    fi
done

echo ""
echo "========================================"
echo "   测试完成"
echo "========================================"
echo ""
echo "如果所有测试都通过，但按钮仍不显示，"
echo "请执行以下步骤:"
echo "1. 打开浏览器开发者工具 (F12)"
echo "2. 切换到 Console 标签"
echo "3. 截图并发送给我"
echo ""
