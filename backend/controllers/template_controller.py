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
import yaml
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import zipfile
import tempfile
from datetime import datetime

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
        
        if not file.filename.endswith('.zip'):
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
            # 解压文件
            with zipfile.ZipFile(file, 'r') as zip_ref:
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
