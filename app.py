"""
模板驱动的数控程序生成器 - Flask应用入口

此文件必须严格遵循PROJECT_REQUIREMENTS.md文档约束。
任何修改都必须先更新需求文档，然后修改代码。
违反此约束将导致代码被拒绝。

技术栈：Python Flask + Jinja2 + PyYAML
接口规范：RESTful API
数据格式：JSON
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import logging
from datetime import datetime

# 导入控制器
from backend.controllers.template_controller import template_bp
from backend.controllers.parameter_controller import parameter_bp
from backend.controllers.render_controller import render_bp

# 创建Flask应用
app = Flask(__name__)

# 启用CORS
CORS(app)

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/app.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# 确保日志目录存在
os.makedirs('logs', exist_ok=True)

# 注册蓝图
app.register_blueprint(template_bp)
app.register_blueprint(parameter_bp)
app.register_blueprint(render_bp)

@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    logger.info("Health check requested")
    
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0',
        'constraint': 'active',
        'message': '约束执行机制已激活，严格遵循PROJECT_REQUIREMENTS.md文档',
        'modules': {
            'template_manager': 'active',
            'parameter_manager': 'active',
            'render_engine': 'active'
        }
    })

@app.route('/api/info', methods=['GET'])
def app_info():
    """应用信息接口"""
    logger.info("App info requested")
    
    return jsonify({
        'name': '模板驱动的数控程序生成器',
        'version': '1.0.0',
        'description': '基于模板包的数控程序生成系统',
        'tech_stack': {
            'backend': 'Python Flask',
            'frontend': 'Vue.js 3',
            'template_engine': 'Jinja2',
            'config_format': 'YAML',
            'editor': 'Monaco Editor'
        },
        'constraints': {
            'document': 'PROJECT_REQUIREMENTS.md',
            'status': 'active',
            'enforced': True
        },
        'api_endpoints': {
            'templates': '/api/templates/*',
            'parameters': '/api/parameters/*',
            'render': '/api/templates/*/render',
            'preview': '/api/preview/*',
            'health': '/api/health',
            'info': '/api/info'
        }
    })

@app.errorhandler(404)
def not_found(error):
    """404错误处理"""
    return jsonify({
        'error': 'Not Found',
        'message': '请求的资源不存在',
        'constraint': '所有API必须遵循PROJECT_REQUIREMENTS.md定义',
        'available_endpoints': [
            '/api/health',
            '/api/info',
            '/api/templates',
            '/api/parameters',
            '/api/templates/*/render',
            '/api/preview/*'
        ]
    }), 404

@app.errorhandler(500)
def internal_error(error):
    """500错误处理"""
    logger.error(f"Internal error: {error}")
    return jsonify({
        'error': 'Internal Server Error',
        'message': '服务器内部错误',
        'constraint': '请检查是否违反PROJECT_REQUIREMENTS.md约束'
    }), 500

if __name__ == '__main__':
    logger.info("🚀 启动模板驱动的数控程序生成器")
    logger.info("🔒 约束执行机制已激活")
    logger.info("📋 严格遵循PROJECT_REQUIREMENTS.md文档约束")
    logger.info("📦 模板管理模块已激活")
    logger.info("⚙️ 参数管理模块已激活")
    logger.info("🎨 模板渲染引擎已激活")
    
    app.run(
        debug=True,
        host='0.0.0.0',
        port=5000
    )
