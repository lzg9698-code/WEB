"""
模板渲染控制器

严格遵循PROJECT_REQUIREMENTS.md文档约束
"""

from flask import Blueprint, request, jsonify, send_file
import logging
from pathlib import Path
import yaml
import tempfile
import zipfile
import math
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from jinja2 import Environment, TemplateError, TemplateSyntaxError, TemplateNotFound, FileSystemLoader
import json
import jinja2

# 创建蓝图
render_bp = Blueprint('render', __name__, url_prefix='/api/render')

logger = logging.getLogger(__name__)

class JinjaRenderer:
    """Jinja2渲染引擎"""
    
    def __init__(self, workspace_path: str = "templates"):
        self.workspace_path = Path(workspace_path)
        self.env = Environment(
            loader=jinja2.FileSystemLoader(str(self.workspace_path)),
            autoescape=False,
            trim_blocks=True,
            lstrip_blocks=True,
            keep_trailing_newline=True
        )
        self._setup_custom_filters()
    
    def _setup_custom_filters(self):
        """设置Jinja2自定义过滤器"""
        def round_filter(value, precision=2):
            try:
                return round(float(value), precision)
            except (ValueError, TypeError):
                return value
        
        def format_filter(value, format_str):
            try:
                return format(float(value), format_str)
            except (ValueError, TypeError):
                return value
        
        def safe_filter(value):
            if value is None:
                return ''
            if isinstance(value, str):
                return str(value)
            return str(value)
        
        def length_filter(value, unit='mm'):
            try:
                if value is None:
                    return '0'
                num_value = float(value)
                if unit.lower() == 'inch':
                    return str(num_value * 25.4)
                return str(num_value)
            except (ValueError, TypeError):
                return value
        
        def angle_filter(value, unit='deg'):
            try:
                if value is None:
                    return '0'
                num_value = float(value)
                if unit.lower() in ['deg', 'degree']:
                    return str(num_value)
                elif unit.lower() in ['rad', 'radian']:
                    return str(num_value * 180 / 3.14159)
                return str(num_value)
            except (ValueError, TypeError):
                return value
        
        def speed_filter(value, unit='rpm'):
            try:
                if value is None:
                    return '0'
                num_value = float(value)
                if unit.lower() in ['rpm', 'rev/min']:
                    return str(num_value)
                return str(num_value)
            except (ValueError, TypeError):
                return value
        
        def sqrt_filter(value):
            try:
                return str(float(value) ** 0.5)
            except (ValueError, TypeError):
                return value
        
        def sin_filter(value):
            try:
                return str(math.sin(math.radians(float(value))))
            except (ValueError, TypeError):
                return value
        
        def cos_filter(value):
            try:
                return str(math.cos(math.radians(float(value))))
            except (ValueError, TypeError):
                return value
        
        def abs_filter(value):
            try:
                return str(abs(float(value)))
            except (ValueError, TypeError):
                return value
        
        def min_filter(*args):
            try:
                return str(min(float(x) for x in args if x is not None))
            except (ValueError, TypeError):
                return args[0] if args else '0'
        
        def max_filter(*args):
            try:
                return str(max(float(x) for x in args if x is not None))
            except (ValueError, TypeError):
                return args[0] if args else '0'
        
        # 注册自定义过滤器
        self.env.filters['round'] = round_filter
        self.env.filters['format'] = format_filter
        self.env.filters['safe'] = safe_filter
        self.env.filters['length'] = length_filter
        self.env.filters['angle'] = angle_filter
        self.env.filters['speed'] = speed_filter
        self.env.filters['sqrt'] = sqrt_filter
        self.env.filters['sin'] = sin_filter
        self.env.filters['cos'] = cos_filter
        self.env.filters['abs'] = abs_filter
        self.env.filters['min'] = min_filter
        self.env.filters['max'] = max_filter
        
        # 设置全局函数
        self.env.globals.update({
            'round': round_filter,
            'format': format_filter,
            'safe': safe_filter,
            'length': length_filter,
            'angle': angle_filter,
            'speed': speed_filter,
            'sqrt': sqrt_filter,
            'sin': sin_filter,
            'cos': cos_filter,
            'abs': abs_filter,
            'min': min_filter,
            'max': max_filter
        })
    
    def render_template(self, template_path: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """渲染单个模板"""
        try:
            template = self.env.get_template(template_path)
            result = template.render(**parameters)
            return {
                'success': True,
                'content': result,
                'template_path': template_path,
                'render_time': datetime.now().isoformat()
            }
        except TemplateError as e:
            logger.error(f"模板渲染失败: {template_path}, 错误: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'template_path': template_path
            }
        except Exception as e:
            logger.error(f"渲染异常: {template_path}, 错误: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'template_path': template_path
            }
    
    def render_package(self, package_path: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """渲染模板包"""
        try:
            package_config = self._load_package_config(package_path)
            results = {}
            
            for output_name, output_config in package_config.get('outputs', {}).get('files', {}):
                if not output_config.get('enabled', True):
                    continue
                
                template_path = output_config['template']
                filename_pattern = output_config.get('filename_pattern', 'output')
                extension = output_config.get('extension', '.nc')
                
                result = self.render_template(template_path, parameters)
                
                filename = self._generate_filename(filename_pattern, parameters) + extension
                
                if result['success']:
                    results[output_name] = {
                        'filename': filename,
                        'content': result['content'],
                        'description': output_config.get('description', ''),
                        'success': True,
                        'render_time': result['render_time']
                    }
                else:
                    results[output_name] = {
                        'filename': filename,
                        'content': '',
                        'description': output_config.get('description', ''),
                        'success': False,
                        'error': result.get('error', '未知错误'),
                        'render_time': datetime.now().isoformat()
                    }
            
            return {
                'success': True,
                'package_path': package_path,
                'results': results,
                'total': len(results),
                'render_time': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"渲染模板包失败: {package_path}, 错误: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'package_path': package_path,
                'results': {},
                'total': 0,
                'render_time': datetime.now().isoformat()
            }
    
    def _load_package_config(self, package_path: str) -> Dict[str, Any]:
        """加载模板包配置"""
        config_file = Path(package_path) / "package.yaml"
        
        if not config_file.exists():
            raise FileNotFoundError(f"模板包配置文件不存在: {config_file}")
        
        with open(config_file, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    
    def _generate_filename(self, pattern: str, parameters: Dict[str, Any]) -> str:
        """生成文件名"""
        try:
            template = self.env.from_string(pattern)
            return template.render(**parameters)
        except Exception as e:
            logger.error(f"生成文件名失败: {pattern}, 错误: {str(e)}")
            return pattern
    
    def get_available_outputs(self, package_path: str) -> List[Dict[str, Any]]:
        """获取可用的输出文件列表"""
        try:
            config = self._load_package_config(package_path)
            outputs = []
            
            for output_name, output_config in config.get('outputs', {}).get('files', {}):
                if output_config.get('enabled', True):
                    outputs.append({
                        'name': output_name,
                        'template': output_config.get('template'),
                        'description': output_config.get('description', ''),
                        'enabled': True
                    })
            
            return outputs
        except Exception as e:
            logger.error(f"获取输出列表失败: {package_path}, 错误: {str(e)}")
            return []
    
    def validate_template(self, template_path: str) -> Dict[str, Any]:
        """验证模板语法"""
        try:
            template = self.env.get_template(template_path)
            return {
                'valid': True,
                'errors': [],
                'warnings': []
            }
        except TemplateSyntaxError as e:
            logger.error(f"模板语法错误: {template_path}, 错误: {str(e)}")
            return {
                'valid': False,
                'errors': [str(e)],
                'warnings': []
            }
        except Exception as e:
            logger.error(f"模板验证异常: {template_path}, 错误: {str(e)}")
            return {
                'valid': False,
                'errors': [str(e)],
                'warnings': []
            }


@render_bp.route('/templates/<package_name>/render', methods=['POST'])
def render_template(package_name: str):
    """渲染指定模板包"""
    try:
        data = request.get_json()
        if not data or 'parameters' not in data:
            return jsonify({
                'success': False,
                'error': '请提供parameters参数'
            }), 400
        
        parameters = data['parameters']
        
        # 这里应该调用模板管理器，现在先简化处理
        from backend.controllers.template_controller import TemplateManager
        package_manager = TemplateManager()
        template_path = package_manager.get_package_by_name(package_name)
        if not template_path:
            return jsonify({
                'success': False,
                'error': f'模板包 {package_name} 不存在'
            }), 404
        
        # 渲染模板包
        render_engine = JinjaRenderer(str(template_path))
        result = render_engine.render_package(str(template_path), parameters)
        
        return jsonify({
            'success': True,
            'data': result,
            'timestamp': result['render_time']
        })
        
    except Exception as e:
        logger.error(f"渲染模板包失败: {package_name}, 错误: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@render_bp.route('/preview/<package_name>', methods=['POST'])
def preview_template(package_name: str):
    """预览模板渲染结果"""
    try:
        data = request.get_json()
        if not data or 'parameters' not in data:
            return jsonify({
                'success': False,
                'error': '请提供parameters参数'
            }), 400
        
        parameters = data['parameters']
        template_name = data.get('template_name')
        
        from backend.controllers.template_controller import TemplateManager
        package_manager = TemplateManager()
        template_path = package_manager.get_package_by_name(package_name)
        if not template_path:
            return jsonify({
                'success': False,
                'error': f'模板包 {package_name} 不存在'
            }), 404
        
        render_engine = JinjaRenderer(str(template_path))
        
        if template_name:
            result = render_engine.render_template(template_name, parameters)
            return jsonify({
                'success': True,
                'data': {
                    'content': result['content'],
                    'template_path': template_name,
                    'preview_time': result['render_time']
                }
            })
        else:
            return jsonify({
                'success': False,
                'error': '没有找到主模板文件'
            }), 404
        
    except Exception as e:
        logger.error(f"预览模板失败: {package_name}, 错误: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@render_bp.route('/templates/<package_name>/export', methods=['POST'])
def export_template(package_name: str):
    """导出渲染结果为ZIP文件"""
    try:
        data = request.get_json()
        if not data or 'parameters' not in data:
            return jsonify({
                'success': False,
                'error': '请提供parameters参数'
            }), 400
        
        parameters = data['parameters']
        
        from backend.controllers.template_controller import TemplateManager
        package_manager = TemplateManager()
        template_path = package_manager.get_package_by_name(package_name)
        if not template_path:
            return jsonify({
                'success': False,
                'error': f'模板包 {package_name} 不存在'
            }), 404
        
        render_engine = JinjaRenderer(str(template_path))
        result = render_engine.render_package(str(template_path), parameters)
        
        if not result.get('success'):
            return jsonify({
                'success': False,
                'error': result.get('error', '渲染失败')
            }), 500
        
        # 创建临时ZIP文件
        temp_dir = tempfile.mkdtemp()
        zip_path = os.path.join(temp_dir, f"{package_name}_export.zip")
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # 添加渲染结果文件
            for filename, file_data in result.get('results', {}).items():
                zipf.writestr(file_data.get('filename', filename), file_data.get('content', ''))
            
            # 添加渲染信息文件
            info_content = f"""# {package_name} 导出信息

导出时间: {result.get('render_time', datetime.now().isoformat())}
模板包: {package_name}
参数数量: {len(parameters)}

## 渲染的文件
"""
            for filename, file_data in result.get('results', {}).items():
                info_content += f"- {file_data.get('filename', filename)}\n"
            
            zipf.writestr('export_info.md', info_content)
        
        # 发送ZIP文件
        return send_file(
            zip_path,
            mimetype='application/zip',
            as_attachment=True,
            download_name=f"{package_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
        )
        
    except Exception as e:
        logger.error(f"导出模板包失败: {package_name}, 错误: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500