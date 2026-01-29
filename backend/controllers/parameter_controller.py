"""
参数管理控制器

此文件必须严格遵循PROJECT_REQUIREMENTS.md文档约束。
任何修改都必须先更新需求文档，然后修改代码。
违反此约束将导致代码被拒绝。

职责边界：
- ✅ 参数定义的解析和管理API
- ✅ 参数值的验证和类型检查API
- ✅ 参数预设的管理和应用API
- ✅ 派生参数的计算API
- ❌ 不负责参数输入界面（由前端组件负责）
- ❌ 不负责参数存储（由文件管理模块负责）
"""

from flask import Blueprint, request, jsonify
import json
import os
import logging
from typing import Dict, Any, List, Tuple, Optional
import re
from datetime import datetime
from .template_controller import template_manager

# 创建蓝图
parameter_bp = Blueprint('parameter', __name__, url_prefix='/api/parameters')

logger = logging.getLogger(__name__)

class ParameterType:
    """参数类型定义"""
    
    STRING = "string"
    NUMBER = "number"
    BOOLEAN = "boolean"
    ARRAY = "array"
    OBJECT = "object"
    LENGTH = "length"
    ANGLE = "angle"
    SPEED = "speed"
    COORDINATE = "coordinate"
    TOOL = "tool"
    MATERIAL = "material"

class ParameterValidator:
    """参数验证器"""
    
    @staticmethod
    def validate_type(value: Any, param_type: str) -> bool:
        """验证参数类型"""
        if value is None:
            return True  # None值在required检查时处理
        
        type_map = {
            ParameterType.STRING: str,
            ParameterType.NUMBER: (int, float),
            ParameterType.BOOLEAN: bool,
            ParameterType.ARRAY: list,
            ParameterType.OBJECT: dict,
            ParameterType.LENGTH: (int, float),
            ParameterType.ANGLE: (int, float),
            ParameterType.SPEED: (int, float),
            ParameterType.COORDINATE: (int, float),
            ParameterType.TOOL: dict,
            ParameterType.MATERIAL: str
        }
        
        expected_type = type_map.get(param_type)
        if expected_type:
            return isinstance(value, expected_type)
        
        return True
    
    @staticmethod
    def validate_range(value: Any, param_range: List[Any]) -> bool:
        """验证参数范围"""
        if value is None:
            return True
        
        if len(param_range) != 2:
            return True
        
        min_val, max_val = param_range
        try:
            num_value = float(value)
            return min_val <= num_value <= max_val
        except (ValueError, TypeError):
            return True
    
    @staticmethod
    def validate_options(value: Any, options: List[Any]) -> bool:
        """验证参数选项"""
        if value is None:
            return True
        
        return value in options

class ParameterCalculator:
    """参数计算器"""
    
    @staticmethod
    def calculate_derived_parameters(parameters: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        """计算派生参数"""
        calculated = {}
        
        try:
            # 示例：计算切削时间
            if "workpiece.length" in parameters and "process.feed_rate" in parameters:
                length = parameters["workpiece.length"]
                feed_rate = parameters["process.feed_rate"]
                if feed_rate > 0:
                    calculated["process.estimated_time"] = length / feed_rate
            
            # 示例：计算材料去除率
            if all(key in parameters for key in ["workpiece.diameter", "workpiece.length", "process.cutting_depth", "process.feed_rate"]):
                diameter = parameters["workpiece.diameter"]
                length = parameters["workpiece.length"]
                depth = parameters["process.cutting_depth"]
                feed = parameters["process.feed_rate"]
                
                if diameter > 0 and feed > 0:
                    # 简化的材料去除率计算
                    mrr = 3.14159 * diameter * depth * feed
                    calculated["process.material_removal_rate"] = mrr
            
            # 添加当前时间
            calculated["now"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
        except Exception as e:
            logger.warning(f"Failed to calculate derived parameters: {e}")
        
        return calculated

class ParameterManager:
    """参数管理器"""
    
    def __init__(self):
        self.validator = ParameterValidator()
        self.calculator = ParameterCalculator()
    
    def get_parameters_config(self, package_name: str) -> Dict[str, Any]:
        """获取参数配置"""
        package = template_manager.get_package_by_name(package_name)
        if not package:
            raise ValueError(f"Template package '{package_name}' not found")
        
        return package.config.get('variables', {})
    
    def validate_parameters(self, package_name: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """验证参数值"""
        try:
            config = self.get_parameters_config(package_name)
            errors = {}
            warnings = {}
            
            # 遍历所有参数组
            for group_name, group_config in config.get("groups", {}).items():
                for param_name, param_config in group_config.get("parameters", {}).items():
                    full_param_name = f"{group_name}.{param_name}"
                    value = parameters.get(full_param_name)
                    
                    # 检查必填项
                    if param_config.get("required", False) and value is None:
                        errors[full_param_name] = "此参数为必填项"
                        continue
                    
                    if value is None:
                        continue  # 可选参数为空值时跳过其他检查
                    
                    # 类型检查
                    param_type = param_config.get("type", ParameterType.STRING)
                    if not self.validator.validate_type(value, param_type):
                        errors[full_param_name] = f"参数类型错误，期望 {param_type}"
                        continue
                    
                    # 范围检查
                    param_range = param_config.get("range")
                    if param_range and not self.validator.validate_range(value, param_range):
                        warnings[full_param_name] = f"参数值超出推荐范围 {param_range}"
                    
                    # 选项检查
                    options = param_config.get("options")
                    if options and not self.validator.validate_options(value, options):
                        errors[full_param_name] = f"参数值无效，可选值: {options}"
            
            return {
                'valid': len(errors) == 0,
                'errors': errors,
                'warnings': warnings
            }
            
        except Exception as e:
            logger.error(f"Failed to validate parameters: {e}")
            return {
                'valid': False,
                'errors': {'system': str(e)},
                'warnings': {}
            }
    
    def calculate_parameters(self, package_name: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """计算派生参数"""
        try:
            config = self.get_parameters_config(package_name)
            calculated = self.calculator.calculate_derived_parameters(parameters, config)
            
            return {
                'success': True,
                'calculated': calculated,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to calculate parameters: {e}")
            return {
                'success': False,
                'error': str(e)
            }

# 全局参数管理器实例
parameter_manager = ParameterManager()

@parameter_bp.route('/<package_name>/config', methods=['GET'])
def get_parameter_config(package_name: str):
    """获取参数配置"""
    try:
        config = parameter_manager.get_parameters_config(package_name)
        return jsonify({
            'success': True,
            'data': config,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Failed to get parameter config for {package_name}: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': f'获取参数配置失败: {package_name}'
        }), 500

@parameter_bp.route('/<package_name>/validate', methods=['POST'])
def validate_parameters(package_name: str):
    """验证参数值"""
    try:
        data = request.get_json()
        if not data or 'parameters' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing parameters in request'
            }), 400
        
        parameters = data['parameters']
        result = parameter_manager.validate_parameters(package_name, parameters)
        
        return jsonify({
            'success': True,
            'data': result,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Failed to validate parameters for {package_name}: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': f'参数验证失败: {package_name}'
        }), 500

@parameter_bp.route('/<package_name>/calculate', methods=['POST'])
def calculate_parameters(package_name: str):
    """计算派生参数"""
    try:
        data = request.get_json()
        if not data or 'parameters' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing parameters in request'
            }), 400
        
        parameters = data['parameters']
        result = parameter_manager.calculate_parameters(package_name, parameters)
        
        return jsonify({
            'success': result['success'],
            'data': result.get('calculated', {}),
            'error': result.get('error'),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Failed to calculate parameters for {package_name}: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': f'参数计算失败: {package_name}'
        }), 500

@parameter_bp.route('/<package_name>/presets', methods=['GET'])
def get_presets(package_name: str):
    """获取模板包的所有参数预设"""
    try:
        presets_dir = os.path.join('presets', package_name)
        presets = []
        
        if os.path.exists(presets_dir):
            for filename in os.listdir(presets_dir):
                if filename.endswith('.json'):
                    preset_path = os.path.join(presets_dir, filename)
                    try:
                        with open(preset_path, 'r', encoding='utf-8') as f:
                            preset_data = json.load(f)
                            presets.append({
                                'name': preset_data.get('name', filename[:-5]),
                                'description': preset_data.get('description', ''),
                                'createdAt': preset_data.get('createdAt', ''),
                                'parameters': preset_data.get('parameters', {})
                            })
                    except Exception as e:
                        logger.warning(f'Failed to load preset {filename}: {e}')
        
        return jsonify({
            'success': True,
            'data': presets,
            'count': len(presets),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f'Failed to get presets for {package_name}: {e}')
        return jsonify({
            'success': False,
            'error': str(e),
            'message': f'获取参数预设失败: {package_name}'
        }), 500

@parameter_bp.route('/<package_name>/presets', methods=['POST'])
def save_preset(package_name: str):
    """保存参数预设"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided',
                'message': '请提供预设数据'
            }), 400
        
        preset_name = data.get('name')
        if not preset_name:
            return jsonify({
                'success': False,
                'error': 'Missing preset name',
                'message': '请提供预设名称'
            }), 400
        
        # 验证preset_name格式
        import re
        if not re.match(r'^[\w\s\-]+$', preset_name):
            return jsonify({
                'success': False,
                'error': 'Invalid preset name',
                'message': '预设名称只能包含字母、数字、空格、下划线和横线'
            }), 400
        
        parameters = data.get('parameters', {})
        description = data.get('description', '')
        
        # 创建预设数据
        preset_data = {
            'name': preset_name,
            'packageName': package_name,
            'description': description,
            'parameters': parameters,
            'createdAt': datetime.now().isoformat()
        }
        
        # 确保目录存在
        presets_dir = os.path.join('presets', package_name)
        os.makedirs(presets_dir, exist_ok=True)
        
        # 保存预设文件
        preset_filename = re.sub(r'[^\w\-]', '_', preset_name) + '.json'
        preset_path = os.path.join(presets_dir, preset_filename)
        
        with open(preset_path, 'w', encoding='utf-8') as f:
            json.dump(preset_data, f, ensure_ascii=False, indent=2)
        
        logger.info(f'✅ 成功保存参数预设: {package_name}/{preset_name}')
        
        return jsonify({
            'success': True,
            'data': {
                'name': preset_name,
                'description': description,
                'createdAt': preset_data['createdAt']
            },
            'message': f'参数预设 "{preset_name}" 保存成功',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f'Failed to save preset for {package_name}: {e}')
        return jsonify({
            'success': False,
            'error': str(e),
            'message': f'保存参数预设失败'
        }), 500

@parameter_bp.route('/<package_name>/presets/<preset_name>', methods=['DELETE'])
def delete_preset(package_name: str, preset_name: str):
    """删除参数预设"""
    try:
        import re
        preset_filename = re.sub(r'[^\w\-]', '_', preset_name) + '.json'
        preset_path = os.path.join('presets', package_name, preset_filename)
        
        if not os.path.exists(preset_path):
            return jsonify({
                'success': False,
                'error': 'Preset not found',
                'message': f'参数预设 "{preset_name}" 不存在'
            }), 404
        
        os.remove(preset_path)
        
        logger.info(f'✅ 成功删除参数预设: {package_name}/{preset_name}')
        
        return jsonify({
            'success': True,
            'message': f'参数预设 "{preset_name}" 已删除',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f'Failed to delete preset {preset_name} for {package_name}: {e}')
        return jsonify({
            'success': False,
            'error': str(e),
            'message': f'删除参数预设失败'
        }), 500

@parameter_bp.route('/<package_name>/presets/<preset_name>/load', methods=['GET'])
def load_preset(package_name: str, preset_name: str):
    """加载参数预设"""
    try:
        import re
        preset_filename = re.sub(r'[^\w\-]', '_', preset_name) + '.json'
        preset_path = os.path.join('presets', package_name, preset_filename)
        
        if not os.path.exists(preset_path):
            return jsonify({
                'success': False,
                'error': 'Preset not found',
                'message': f'参数预设 "{preset_name}" 不存在'
            }), 404
        
        with open(preset_path, 'r', encoding='utf-8') as f:
            preset_data = json.load(f)
        
        return jsonify({
            'success': True,
            'data': {
                'name': preset_data.get('name', preset_name),
                'description': preset_data.get('description', ''),
                'parameters': preset_data.get('parameters', {}),
                'createdAt': preset_data.get('createdAt', '')
            },
            'message': f'参数预设 "{preset_name}" 加载成功',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f'Failed to load preset {preset_name} for {package_name}: {e}')
        return jsonify({
            'success': False,
            'error': str(e),
            'message': f'加载参数预设失败'
        }), 500
