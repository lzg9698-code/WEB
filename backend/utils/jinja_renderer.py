"""
Jinja2模板渲染引擎

此文件必须严格遵循PROJECT_REQUIREMENTS.md文档约束。

渲染引擎核心功能：
- Jinja2模板的解析和渲染
- 自定义过滤器
- 自定义全局函数
"""

import logging
from jinja2 import Environment, FileSystemLoader, BaseLoader, TemplateSyntaxError
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class RenderEngine:
    """模板渲染引擎"""
    
    def __init__(self, template_path: str = "."):
        """
        初始化渲染引擎
        
        Args:
            template_path: 模板根目录路径
        """
        self.template_path = Path(template_path)
        self.env = Environment(
            loader=FileSystemLoader(str(self.template_path)),
            extensions=['jinja2.ext.do', 'jinja2.ext.loopcontrols'],
            autoescape=False,
            trim_blocks=True,
            lstrip_blocks=True
        )
        self._setup_filters()
        self._setup_globals()
    
    def _setup_filters(self):
        """设置自定义过滤器"""
        self.env.filters['round'] = lambda value, digits=2: round(float(value), digits)
        self.env.filters['format'] = lambda value, fmt: format(value, fmt)
        self.env.filters['abs'] = abs
        self.env.filters['min'] = min
        self.env.filters['max'] = max
        
        try:
            import math
            self.env.filters['sin'] = lambda x: math.sin(math.radians(float(x)))
            self.env.filters['cos'] = lambda x: math.cos(math.radians(float(x)))
            self.env.filters['tan'] = lambda x: math.tan(math.radians(float(x)))
            self.env.filters['sqrt'] = lambda x: math.sqrt(float(x))
            self.env.filters['log'] = lambda x: math.log(float(x))
            self.env.filters['log10'] = lambda x: math.log10(float(x))
        except ImportError:
            logger.warning("math module not available, trig filters disabled")
    
    def _setup_globals(self):
        """设置全局函数"""
        try:
            import math
            self.env.globals['sin'] = lambda x: math.sin(math.radians(float(x)))
            self.env.globals['cos'] = lambda x: math.cos(math.radians(float(x)))
            self.env.globals['tan'] = lambda x: math.tan(math.radians(float(x)))
            self.env.globals['sqrt'] = lambda x: math.sqrt(float(x))
            self.env.globals['abs'] = abs
            self.env.globals['min'] = min
            self.env.globals['max'] = max
            self.env.globals['range'] = range
            self.env.globals['len'] = len
            self.env.globals['int'] = int
            self.env.globals['float'] = float
            self.env.globals['str'] = str
            self.env.globals['bool'] = bool
        except ImportError:
            pass
    
    def render_template(self, template_path: str, parameters: Dict[str, Any]) -> str:
        """
        渲染单个模板文件
        
        Args:
            template_path: 模板文件路径（相对于模板根目录）
            parameters: 渲染参数
            
        Returns:
            渲染后的文本内容
        """
        try:
            template = self.env.get_template(template_path)
            return template.render(**parameters)
        except Exception as e:
            logger.error(f"Failed to render template {template_path}: {e}")
            raise
    
    def render_string(self, template_content: str, parameters: Dict[str, Any]) -> str:
        """
        渲染模板字符串
        
        Args:
            template_content: 模板内容字符串
            parameters: 渲染参数
            
        Returns:
            渲染后的文本内容
        """
        try:
            template = self.env.from_string(template_content)
            return template.render(**parameters)
        except Exception as e:
            logger.error(f"Failed to render template string: {e}")
            raise
    
    def render_package(
        self, 
        package_path: str, 
        template_file: str, 
        parameters: Dict[str, Any]
    ) -> Dict[str, str]:
        """
        渲染模板包中的模板
        
        Args:
            package_path: 模板包路径
            template_file: 模板文件名
            parameters: 渲染参数
            
        Returns:
            包含filename和content的字典
        """
        try:
            # 渲染内容
            content = self.render_template(template_file, parameters)
            
            # 生成输出文件名
            filename = self._generate_filename(parameters)
            
            return {
                'filename': filename,
                'content': content
            }
        except Exception as e:
            logger.error(f"Failed to render package template: {e}")
            raise
    
    def _generate_filename(self, parameters: Dict[str, Any]) -> str:
        """
        生成输出文件名
        
        Args:
            parameters: 渲染参数
            
        Returns:
            生成的文件名（不含扩展名）
        """
        # 优先使用 program_name
        if 'program_name' in parameters:
            name = str(parameters['program_name'])
            # 移除非法字符
            import re
            name = re.sub(r'[^\w\-]', '_', name)
            return name
        
        # 使用时间戳作为后备
        from datetime import datetime
        return f"output_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    def validate_template(self, template_content: str) -> Dict[str, Any]:
        """
        验证模板语法
        
        Args:
            template_content: 模板内容
            
        Returns:
            验证结果字典
        """
        try:
            template = self.env.from_string(template_content)
            return {
                'valid': True,
                'errors': []
            }
        except Exception as e:
            return {
                'valid': False,
                'errors': [str(e)]
            }
    
    def get_template_source(self, template_path: str) -> Optional[str]:
        """
        获取模板源码
        
        Args:
            template_path: 模板文件路径
            
        Returns:
            模板源码内容
        """
        try:
            template = self.env.get_template(template_path)
            if self.env.loader:
                template_file = self.env.loader.get_source(self.env, template_path)
                return template_file[0]
            return None
        except Exception as e:
            logger.error(f"Failed to get template source: {e}")
            return None
    
    def validate_template_syntax(self, template_content: str, parameters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        验证模板语法和变量
        
        Args:
            template_content: 模板内容
            parameters: 可选的测试参数
            
        Returns:
            验证结果字典
        """
        try:
            # 创建模板
            template = self.env.from_string(template_content)
            
            # 如果提供了参数，尝试渲染
            if parameters:
                template.render(**parameters)
            
            return {
                'valid': True,
                'errors': [],
                'warnings': []
            }
        except TemplateSyntaxError as e:
            return {
                'valid': False,
                'errors': [{
                    'type': 'syntax',
                    'message': str(e),
                    'line': e.lineno,
                    'column': getattr(e, 'colno', None),
                    'source': e.source if hasattr(e, 'source') else template_content
                }],
                'warnings': []
            }
        except Exception as e:
            return {
                'valid': False,
                'errors': [{
                    'type': 'runtime',
                    'message': str(e),
                    'line': None,
                    'column': None,
                    'source': template_content
                }],
                'warnings': []
            }
    
    def extract_variables(self, template_content: str) -> Dict[str, Any]:
        """
        从模板中提取变量
        
        Args:
            template_content: 模板内容
            
        Returns:
            提取的变量字典
        """
        try:
            import re
            
            # 提取 {{ variable }} 格式的变量
            variable_pattern = r'\{\{\s*([^}]+)\s*\}\}'
            variables = re.findall(variable_pattern, template_content)
            
            # 提取 {% for variable in ... %} 格式的变量
            for_pattern = r'\{%\s*for\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+in\s+[^%]+%\}'
            for_vars = re.findall(for_pattern, template_content)
            variables.extend(for_vars)
            
            # 提取 {% if variable %} 格式的变量
            if_pattern = r'\{%\s*if\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:[!=<>]+.*?)?%\}'
            if_vars = re.findall(if_pattern, template_content)
            variables.extend(if_vars)
            
            # 清理和去重
            cleaned_vars = []
            seen = set()
            
            for var in variables:
                # 清理变量名
                clean_var = var.split('|')[0].strip()  # 移除过滤器
                clean_var = clean_var.split('.')[0].strip()  # 移除属性访问
                
                if clean_var and clean_var not in seen:
                    cleaned_vars.append({
                        'name': clean_var,
                        'usage': var.strip(),
                        'type': 'variable'
                    })
                    seen.add(clean_var)
            
            return {
                'variables': cleaned_vars,
                'count': len(cleaned_vars)
            }
        except Exception as e:
            logger.error(f"Failed to extract variables: {e}")
            return {
                'variables': [],
                'count': 0,
                'error': str(e)
            }
