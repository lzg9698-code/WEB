"""
模板管理控制器

此文件必须严格遵循PROJECT_REQUIREMENTS.md文档约束。
任何修改都必须先更新需求文档，然后修改代码。
违反此约束将导致代码被拒绝。

职责边界：
- ✅ 模板包的导入、导出、安装、卸载API
- ✅ 模板包信息管理API
- ✅ 模板包列表展示和搜索API
- ❌ 不负责模板内容编辑（由编辑器模块负责）
- ❌ 不负责参数验证（由参数管理模块负责）
"""

from flask import Blueprint, request, jsonify, send_file
import os
import sys
import yaml
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import zipfile
import tempfile
from datetime import datetime

# 添加 backend 目录到 Python 路径
backend_path = Path(__file__).parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from utils.jinja_renderer import RenderEngine

# 创建蓝图
template_bp = Blueprint('template', __name__, url_prefix='/api/templates')

logger = logging.getLogger(__name__)

class TemplatePackage:
    """模板包实体类"""
    
    def __init__(self, package_path: str):
        self.path = Path(package_path)
        self.config_file = self.path / "package.yaml"
        self.templates_dir = self.path / "templates"
        self._config = None
    
    @property
    def config(self) -> dict:
        """获取YAML配置"""
        if self._config is None:
            self._config = self._load_config()
        return self._config
    
    @property
    def name(self) -> str:
        """包名"""
        return self.config["package"]["name"]
    
    @property
    def display_name(self) -> str:
        """显示名称"""
        return self.config["package"]["displayName"]
    
    @property
    def version(self) -> str:
        """版本号"""
        return self.config["package"]["version"]
    
    @property
    def description(self) -> str:
        """描述"""
        return self.config["package"]["description"]
    
    @property
    def category(self) -> str:
        """分类"""
        return self.config["package"]["category"]
    
    @property
    def tags(self) -> List[str]:
        """标签列表"""
        return self.config["package"].get("tags", [])
    
    @property
    def author(self) -> str:
        """作者"""
        return self.config["package"].get("author", "")
    
    @property
    def icon(self) -> str:
        """图标"""
        return self.config["package"].get("icon", "📦")
    
    @property
    def color(self) -> str:
        """主题色"""
        return self.config["package"].get("color", "#2196F3")
    
    def get_template_files(self) -> List[str]:
        """获取所有模板文件列表"""
        templates = []
        if self.templates_dir.exists():
            for file in self.templates_dir.rglob("*.j2"):
                templates.append(str(file.relative_to(self.templates_dir)))
        return templates
    
    def _load_config(self) -> dict:
        """加载YAML配置文件"""
        try:
            with open(self.config_file, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        except Exception as e:
            logger.error(f"Failed to load config from {self.config_file}: {e}")
            raise

class TemplateManager:
    """模板管理器"""
    
    def __init__(self, workspace_path: str = "packages"):
        self.workspace_path = Path(workspace_path)
        self.packages_dir = self.workspace_path
        self.packages: Dict[str, TemplatePackage] = {}
        self._scan_packages()
    
    def _scan_packages(self):
        """扫描所有模板包"""
        self.packages.clear()
        if self.packages_dir.exists():
            for package_dir in self.packages_dir.iterdir():
                if package_dir.is_dir():
                    config_file = package_dir / "package.yaml"
                    if config_file.exists():
                        try:
                            package = TemplatePackage(str(package_dir))
                            self.packages[package.name] = package
                        except Exception as e:
                            logger.warning(f"Failed to load package {package_dir}: {e}")
    
    def get_all_packages(self) -> List[Dict[str, Any]]:
        """获取所有模板包信息"""
        packages_info = []
        for name, package in self.packages.items():
            packages_info.append({
                'name': package.name,
                'displayName': package.display_name,
                'version': package.version,
                'description': package.description,
                'category': package.category,
                'tags': package.tags,
                'author': package.author,
                'icon': package.icon,
                'color': package.color,
                'templateFiles': package.get_template_files()
            })
        return packages_info
    
    def get_package_by_name(self, package_name: str) -> Optional[TemplatePackage]:
        """根据名称获取模板包"""
        return self.packages.get(package_name)
    
    def validate_package(self, package_path: str) -> Dict[str, Any]:
        """验证模板包"""
        errors = []
        warnings = []
        
        path = Path(package_path)
        
        # 检查必要文件
        if not (path / "package.yaml").exists():
            errors.append("缺少package.yaml配置文件")
        
        if not (path / "templates").exists():
            errors.append("缺少templates目录")
        
        # 验证配置文件
        if (path / "package.yaml").exists():
            try:
                package = TemplatePackage(package_path)
                
                # 检查必要配置项
                required_keys = ['package', 'variables', 'outputs']
                config = package.config
                for key in required_keys:
                    if key not in config:
                        errors.append(f"配置文件缺少必要节: {key}")
                
                # 检查模板文件
                template_files = package.get_template_files()
                if not template_files:
                    warnings.append("模板包中没有任何模板文件")
                
            except Exception as e:
                errors.append(f"配置文件解析失败: {str(e)}")
        
        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings
        }

# 全局模板管理器实例
template_manager = TemplateManager()

@template_bp.route('/', methods=['GET'])
def get_templates():
    """获取所有模板包列表"""
    try:
        packages = template_manager.get_all_packages()
        return jsonify({
            'success': True,
            'data': packages,
            'count': len(packages),
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Failed to get templates: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': '获取模板包列表失败'
        }), 500

@template_bp.route('/<package_name>', methods=['GET'])
def get_template(package_name: str):
    """获取指定模板包详情"""
    try:
        package = template_manager.get_package_by_name(package_name)
        if not package:
            return jsonify({
                'success': False,
                'error': 'Package not found',
                'message': f'模板包 {package_name} 不存在'
            }), 404
        
        return jsonify({
            'success': True,
            'data': {
                'name': package.name,
                'displayName': package.display_name,
                'version': package.version,
                'description': package.description,
                'category': package.category,
                'tags': package.tags,
                'author': package.author,
                'icon': package.icon,
                'color': package.color,
                'config': package.config,
                'templateFiles': package.get_template_files()
            },
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Failed to get template {package_name}: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': f'获取模板包 {package_name} 详情失败'
        }), 500

@template_bp.route('/scan', methods=['POST'])
def scan_templates():
    """重新扫描模板包"""
    try:
        template_manager._scan_packages()
        packages = template_manager.get_all_packages()
        return jsonify({
            'success': True,
            'data': packages,
            'count': len(packages),
            'message': '模板包扫描完成',
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Failed to scan templates: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': '模板包扫描失败'
        }), 500

@template_bp.route('/', methods=['POST'])
def import_template():
    """导入模板包（上传zip文件）"""
    try:
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file provided',
                'message': '请选择要上传的文件'
            }), 400
        
        file = request.files['file']
        
        if not file.filename or not file.filename.endswith('.zip'):
            return jsonify({
                'success': False,
                'error': 'Invalid file type',
                'message': '只支持.zip格式的模板包文件'
            }), 400
        
        # 创建临时目录
        import tempfile
        import shutil
        
        temp_dir = tempfile.mkdtemp()
        extract_path = os.path.join(temp_dir, 'extracted')
        os.makedirs(extract_path)
        
        try:
            # 保存上传的文件到临时路径
            temp_file_path = os.path.join(temp_dir, file.filename)
            file.save(temp_file_path)
            
            # 解压文件
            with zipfile.ZipFile(temp_file_path, 'r') as zip_ref:
                zip_ref.extractall(extract_path)
            
            # 验证模板包
            validation = template_manager.validate_package(extract_path)
            
            if not validation['valid']:
                return jsonify({
                    'success': False,
                    'error': 'Validation failed',
                    'message': '模板包验证失败',
                    'validation': validation
                }), 400
            
            # 获取包名并复制到packages目录
            package_config_path = os.path.join(extract_path, 'package.yaml')
            with open(package_config_path, 'r', encoding='utf-8') as f:
                config = yaml.safe_load(f)
                package_name = config['package']['name']
            
            target_path = template_manager.packages_dir / package_name
            
            if target_path.exists():
                # 如果已存在，先删除
                shutil.rmtree(target_path)
            
            # 复制到packages目录
            shutil.copytree(extract_path, target_path)
            
            # 重新扫描
            template_manager._scan_packages()
            
            logger.info(f'✅ 成功导入模板包: {package_name}')
            
            return jsonify({
                'success': True,
                'data': {
                    'name': package_name,
                    'displayName': config['package']['displayName']
                },
                'message': f'模板包 {config["package"]["displayName"]} 导入成功',
                'timestamp': datetime.now().isoformat()
            })
            
        finally:
            # 清理临时文件
            shutil.rmtree(temp_dir, ignore_errors=True)
            
    except Exception as e:
        logger.error(f'Failed to import template: {e}')
        return jsonify({
            'success': False,
            'error': str(e),
            'message': '模板包导入失败'
        }), 500

@template_bp.route('/<package_name>', methods=['DELETE'])
def delete_template(package_name: str):
    """删除模板包"""
    try:
        package = template_manager.get_package_by_name(package_name)
        
        if not package:
            return jsonify({
                'success': False,
                'error': 'Package not found',
                'message': f'模板包 {package_name} 不存在'
            }), 404
        
        # 获取包信息用于返回
        display_name = package.display_name
        
        # 删除目录
        import shutil
        shutil.rmtree(package.path)
        
        # 从管理器中移除
        del template_manager.packages[package_name]
        
        logger.info(f'✅ 成功删除模板包: {package_name}')
        
        return jsonify({
            'success': True,
            'message': f'模板包 {display_name} 已删除',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f'Failed to delete template {package_name}: {e}')
        return jsonify({
            'success': False,
            'error': str(e),
            'message': f'删除模板包 {package_name} 失败'
        }), 500

@template_bp.route('/<package_name>/export', methods=['GET'])
def export_template(package_name: str):
    """导出模板包为zip文件"""
    try:
        package = template_manager.get_package_by_name(package_name)
        
        if not package:
            return jsonify({
                'success': False,
                'error': 'Package not found',
                'message': f'模板包 {package_name} 不存在'
            }), 404
        
        # 创建临时zip文件
        import tempfile
        import shutil
        
        temp_file = tempfile.NamedTemporaryFile(suffix='.zip', delete=False)
        temp_file.close()
        
        try:
            # 创建zip文件
            with zipfile.ZipFile(temp_file.name, 'w', zipfile.ZIP_DEFLATED) as zip_ref:
                for root, dirs, files in os.walk(package.path):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, package.path.parent)
                        zip_ref.write(file_path, arcname)
            
            # 发送文件
            return send_file(
                temp_file.name,
                as_attachment=True,
                download_name=f'{package_name}_{package.version}.zip',
                mimetype='application/zip'
            )
            
        except Exception:
            os.unlink(temp_file.name)
            raise
            
    except Exception as e:
        logger.error(f'Failed to export template {package_name}: {e}')
        return jsonify({
            'success': False,
            'error': str(e),
            'message': f'导出模板包 {package_name} 失败'
        }), 500

@template_bp.route('/create', methods=['POST'])
def create_template():
    """创建新模板包"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided',
                'message': '请提供模板包配置信息'
            }), 400
        
        # 验证必要字段
        required_fields = ['name', 'displayName', 'version', 'category', 'description']
        missing_fields = [f for f in required_fields if not data.get(f)]
        if missing_fields:
            return jsonify({
                'success': False,
                'error': 'Missing required fields',
                'message': f'缺少必要字段: {", ".join(missing_fields)}'
            }), 400
        
        package_name = data['name']
        
        # 检查是否已存在
        if template_manager.get_package_by_name(package_name):
            return jsonify({
                'success': False,
                'error': 'Package already exists',
                'message': f'模板包 {package_name} 已存在'
            }), 400
        
        # 验证包名格式
        import re
        if not re.match(r'^[a-zA-Z][a-zA-Z0-9_-]*$', package_name):
            return jsonify({
                'success': False,
                'error': 'Invalid package name',
                'message': '模板包名称必须以字母开头，只能包含字母、数字、下划线和横线'
            }), 400
        
        # 创建模板包目录
        package_path = template_manager.packages_dir / package_name
        package_path.mkdir(exist_ok=True)
        
        # 创建templates目录
        templates_dir = package_path / 'templates'
        templates_dir.mkdir(exist_ok=True)
        
        # 生成默认模板文件
        default_template = """{# """ + data['displayName'] + """ - 主模板 #}
{# 严格遵循PROJECT_REQUIREMENTS.md文档约束 #}

O{{ program_number }} ({{ program_name }})

(程序说明: {{ description }})
(创建时间: {{ creation_date }})

G90 G54 G17
M06 T{{ tool_number }}
M03 S{{ spindle_speed }}
G00 X{{ start_x }} Y{{ start_y }}
G43 Z{{ safe_height }} H{{ tool_length }}

{% for move in rapid_moves %}
G00 X{{ move.x }} Y{{ move.y }}
{% endfor %}

M05
M30
%
"""
        
        main_template_path = templates_dir / 'main.j2'
        with open(main_template_path, 'w', encoding='utf-8') as f:
            f.write(default_template)
        
        # 构建完整的package.yaml配置
        package_config = {
            'package': {
                'name': package_name,
                'displayName': data['displayName'],
                'version': data['version'],
                'description': data['description'],
                'category': data['category'],
                'tags': data.get('tags', []),
                'author': data.get('author', ''),
                'icon': data.get('icon', '📦'),
                'color': data.get('color', '#3498db'),
                'language': data.get('language', 'zh-CN')
            },
            'dependencies': [],
            'templates': {
                'main': 'templates/main.j2'
            },
            'variables': {
                'groups': {
                    'basic': {
                        'name': '基本参数',
                        'icon': '🔧',
                        'parameters': {
                            'program_name': {
                                'type': 'string',
                                'label': '程序名称',
                                'description': '数控程序的名称',
                                'default': package_name.upper(),
                                'required': True
                            },
                            'program_number': {
                                'type': 'number',
                                'label': '程序号',
                                'description': 'O程序号',
                                'default': 10001,
                                'required': True
                            },
                            'tool_number': {
                                'type': 'number',
                                'label': '刀具号',
                                'description': '刀具编号',
                                'default': 1,
                                'required': True
                            },
                            'spindle_speed': {
                                'type': 'speed',
                                'label': '主轴转速',
                                'unit': 'rpm',
                                'default': 3000,
                                'range': [100, 30000],
                                'required': True
                            },
                            'feed_rate': {
                                'type': 'speed',
                                'label': '进给速度',
                                'unit': 'mm/min',
                                'default': 1500,
                                'range': [10, 10000],
                                'required': True
                            },
                            'start_x': {
                                'type': 'length',
                                'label': '起始X坐标',
                                'unit': 'mm',
                                'default': 0,
                                'required': True
                            },
                            'start_y': {
                                'type': 'length',
                                'label': '起始Y坐标',
                                'unit': 'mm',
                                'default': 0,
                                'required': True
                            },
                            'safe_height': {
                                'type': 'length',
                                'label': '安全高度',
                                'unit': 'mm',
                                'default': 10,
                                'range': [1, 100],
                                'required': True
                            },
                            'tool_length': {
                                'type': 'length',
                                'label': '刀具长度',
                                'unit': 'mm',
                                'default': 50,
                                'required': True
                            },
                            'description': {
                                'type': 'string',
                                'label': '程序描述',
                                'description': '程序说明信息',
                                'default': '',
                                'required': False
                            },
                            'creation_date': {
                                'type': 'string',
                                'label': '创建日期',
                                'description': '程序创建日期',
                                'default': '2026-01-15',
                                'required': False
                            },
                            'rapid_moves': {
                                'type': 'array',
                                'label': '快速移动点',
                                'description': '快速移动坐标点列表',
                                'default': [],
                                'required': False
                            }
                        }
                    }
                }
            },
            'outputs': {
                'default_format': '.nc',
                'supported_formats': ['.nc', '.mpf', '.spf', '.txt'],
                'files': {
                    'main_program': {
                        'template': 'templates/main.j2',
                        'filename_pattern': '{{program_name}}',
                        'extension': '.nc',
                        'description': '主加工程序',
                        'enabled': True,
                        'is_default': True
                    }
                }
            },
            'presets': {
                '默认': {
                    'description': '默认参数',
                    'parameters': {}
                }
            },
            'validation': {
                'rules': {
                    'safe_height_check': {
                        'condition': 'safe_height > 5',
                        'message': '安全高度建议大于5mm',
                        'level': 'warning'
                    }
                }
            }
        }
        
        # 保存package.yaml
        package_config_path = package_path / 'package.yaml'
        with open(package_config_path, 'w', encoding='utf-8') as f:
            yaml.dump(package_config, f, allow_unicode=True, sort_keys=False)
        
        # 重新扫描并返回新创建的模板包
        template_manager._scan_packages()
        package = template_manager.get_package_by_name(package_name)
        
        logger.info(f'✅ 成功创建模板包: {package_name}')
        
        # 重新扫描并获取新创建的模板包
        template_manager._scan_packages()
        new_package = template_manager.get_package_by_name(package_name)
        
        if not new_package:
            return jsonify({
                'success': True,
                'message': f'模板包创建成功，但无法立即加载',
                'data': {
                    'name': package_name,
                    'displayName': data['displayName'],
                    'version': data['version']
                }
            })
        
        return jsonify({
            'success': True,
            'data': {
                'name': new_package.name,
                'displayName': new_package.display_name,
                'version': new_package.version
            },
            'message': f'模板包 {new_package.display_name} 创建成功',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f'Failed to create template: {e}')
        return jsonify({
            'success': False,
            'error': str(e),
            'message': '创建模板包失败'
        }), 500

@template_bp.route('/<package_name>/duplicate', methods=['POST'])
def duplicate_template(package_name: str):
    """复制模板包"""
    try:
        data = request.get_json() or {}
        new_name = data.get('newName', f'{package_name}_copy')
        new_display_name = data.get('newDisplayName', f'{package_name} (副本)')
        
        # 验证新包名格式
        import re
        if not re.match(r'^[a-zA-Z][a-zA-Z0-9_-]*$', new_name):
            return jsonify({
                'success': False,
                'error': 'Invalid package name',
                'message': '模板包名称必须以字母开头，只能包含字母、数字、下划线和横线'
            }), 400
        
        # 检查原包是否存在
        source_package = template_manager.get_package_by_name(package_name)
        if not source_package:
            return jsonify({
                'success': False,
                'error': 'Source package not found',
                'message': f'源模板包 {package_name} 不存在'
            }), 404
        
        # 检查新包名是否已存在
        if template_manager.get_package_by_name(new_name):
            return jsonify({
                'success': False,
                'error': 'Package already exists',
                'message': f'模板包 {new_name} 已存在'
            }), 400
        
        import shutil
        
        # 复制目录
        source_path = source_package.path
        target_path = template_manager.packages_dir / new_name
        shutil.copytree(source_path, target_path)
        
        # 更新package.yaml中的名称
        config_path = target_path / 'package.yaml'
        with open(config_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)
        
        config['package']['name'] = new_name
        config['package']['displayName'] = new_display_name
        
        with open(config_path, 'w', encoding='utf-8') as f:
            yaml.dump(config, f, allow_unicode=True, sort_keys=False)
        
        # 重新扫描
        template_manager._scan_packages()
        
        new_package = template_manager.get_package_by_name(new_name)
        
        if not new_package:
            return jsonify({
                'success': True,
                'message': f'模板包复制成功，但无法立即加载',
                'data': {
                    'name': new_name,
                    'displayName': new_display_name
                }
            })
        
        logger.info(f'✅ 成功复制模板包: {package_name} -> {new_name}')
        
        return jsonify({
            'success': True,
            'data': {
                'name': new_package.name,
                'displayName': new_package.display_name,
                'version': new_package.version
            },
            'message': f'模板包 {new_display_name} 复制成功',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f'Failed to duplicate template {package_name}: {e}')
        return jsonify({
            'success': False,
            'error': str(e),
            'message': f'复制模板包 {package_name} 失败'
        }), 500

@template_bp.route('/<package_name>/preview', methods=['GET'])
def preview_template(package_name: str):
    """预览模板（返回默认渲染结果）"""
    try:
        package = template_manager.get_package_by_name(package_name)
        
        if not package:
            return jsonify({
                'success': False,
                'error': 'Package not found',
                'message': f'模板包 {package_name} 不存在'
            }), 404
        
        # 获取默认参数
        config = package.config
        default_params = {}
        
        if 'variables' in config and 'groups' in config['variables']:
            for group_name, group_data in config['variables']['groups'].items():
                if 'parameters' in group_data:
                    for param_name, param_data in group_data['parameters'].items():
                        if 'default' in param_data:
                             default_params[param_name] = param_data['default']
        
        # 渲染模板
        render_engine = RenderEngine(str(package.path))
        
        preview_content = ''
        try:
            main_template = config['templates']['main']
            preview_content = render_engine.render_template(main_template, default_params)
        except Exception as e:
            preview_content = f'; 预览失败: {str(e)}\n; 请检查模板配置和参数定义'
        
        return jsonify({
            'success': True,
            'data': {
                'content': preview_content,
                'parameters': default_params
            },
            'message': '预览生成成功',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f'Failed to preview template {package_name}: {e}')
        return jsonify({
            'success': False,
            'error': str(e),
            'message': f'生成预览失败'
        }), 500

@template_bp.route('/<package_name>/versions', methods=['GET'])
def get_template_versions(package_name: str):
    """获取模板版本历史"""
    try:
        package = template_manager.get_package_by_name(package_name)
        
        if not package:
            return jsonify({
                'success': False,
                'error': 'Package not found',
                'message': f'模板包 {package_name} 不存在'
            }), 404
        
        # 模拟版本历史（实际应从版本控制系统中获取）
        versions = [
            {
                'version': package.version,
                'createdAt': datetime.now().isoformat(),
                'description': '当前版本'
            }
        ]
        
        return jsonify({
            'success': True,
            'data': versions,
            'count': len(versions),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f'Failed to get versions for template {package_name}: {e}')
        return jsonify({
            'success': False,
            'error': str(e),
            'message': f'获取版本历史失败'
        }), 500
