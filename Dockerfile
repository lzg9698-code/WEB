# ========================================
# 模板驱动的数控程序生成器 - Docker配置
# 严格遵循PROJECT_REQUIREMENTS.md文档约束
# ========================================

# 构建阶段
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci

# 复制源代码
COPY . .

# 构建前端应用
RUN npm run build

# ========================================
# 生产阶段 - 后端
FROM python:3.11-slim AS backend

# 设置工作目录
WORKDIR /home/lzg9698/my_project/mytool

# 安装Python依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制构建好的前端文件
COPY --from=builder /app/dist ./static

# 复制后端代码
COPY backend ./backend
COPY app.py .

# 暴露端口
EXPOSE 5000

# 环境变量
ENV FLASK_APP=app.py
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

# 启动命令
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--threads", "8", "--timeout", "120", "app:app"]

# ========================================
# 开发阶段
FROM node:18-alpine AS dev

WORKDIR /home/lzg9698/my_project/mytool

# 安装Python
RUN apk add --no-cache python3 py3-pip

# 复制依赖文件
COPY package*.json ./
COPY requirements.txt ./

# 安装Node依赖
RUN npm ci

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 5000 5173

# 启动开发服务器
CMD ["sh", "-c", "python3 app.py & npm run dev"]
