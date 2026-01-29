#!/bin/bash
# 一键启动前后端服务
# 严格遵循PROJECT_REQUIREMENTS.md文档约束

set -e

echo "🔧 模板驱动的数控程序生成器 - 服务启动脚本"
echo "=============================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT=5000
FRONTEND_PORT=3000
LOG_DIR="$PROJECT_DIR/logs"

# 确保日志目录存在
mkdir -p "$LOG_DIR"

# 停止现有服务
echo ""
echo "${YELLOW}🛑 停止现有服务...${NC}"

# 停止后端服务
if lsof -i:$BACKEND_PORT > /dev/null 2>&1; then
    echo "  停止后端服务 (端口 $BACKEND_PORT)..."
    lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
    sleep 1
else
    echo "  后端服务未运行"
fi

# 停止前端服务
if lsof -i:$FRONTEND_PORT > /dev/null 2>&1; then
    echo "  停止前端服务 (端口 $FRONTEND_PORT)..."
    lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
    sleep 1
else
    echo "  前端服务未运行"
fi

# 清理残留进程
pkill -f "vite" 2>/dev/null || true
pkill -f "python.*app.py" 2>/dev/null || true
sleep 1

echo ""
echo "${BLUE}📦 启动后端服务...${NC}"

# 检查后端依赖
if ! python3 -c "import flask" 2>/dev/null; then
    echo "${YELLOW}安装后端依赖...${NC}"
    pip install -q flask flask-cors pyyaml jinja2
fi

# 启动后端
cd "$PROJECT_DIR"
nohup python3 app.py > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
sleep 3

# 检查后端是否启动成功
if lsof -i:$BACKEND_PORT > /dev/null 2>&1; then
    echo "${GREEN}✅ 后端服务启动成功 (PID: $BACKEND_PID)${NC}"
else
    echo "${RED}❌ 后端服务启动失败${NC}"
    echo "查看日志: cat $LOG_DIR/backend.log"
    exit 1
fi

echo ""
echo "${BLUE}🎨 启动前端服务...${NC}"

# 启动前端
cd "$PROJECT_DIR"
nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
sleep 5

# 检查前端是否启动成功
if lsof -i:$FRONTEND_PORT > /dev/null 2>&1; then
    echo "${GREEN}✅ 前端服务启动成功 (PID: $FRONTEND_PID)${NC}"
else
    echo "${RED}❌ 前端服务启动失败${NC}"
    echo "查看日志: cat $LOG_DIR/frontend.log"
fi

echo ""
echo "=============================================="
echo "${GREEN}🎉 服务启动完成！${NC}"
echo ""
echo "访问地址:"
echo "  ${BLUE}前端界面:${NC}  http://localhost:$FRONTEND_PORT"
echo "  ${BLUE}后端API:${NC}   http://localhost:$BACKEND_PORT/api/"
echo ""
echo "健康检查:"
echo "  curl http://localhost:$BACKEND_PORT/api/health"
echo ""
echo "日志查看:"
echo "  后端: tail -f $LOG_DIR/backend.log"
echo "  前端: tail -f $LOG_DIR/frontend.log"
echo ""
echo "${YELLOW}按 Ctrl+C 停止所有服务${NC}"

# 等待用户中断
wait
