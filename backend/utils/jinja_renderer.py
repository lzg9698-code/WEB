"""
Jinja2模板渲染引擎

此文件必须严格遵循PROJECT_REQUIREMENTS.md文档约束。

渲染引擎核心功能：
- Jinja2模板的解析和渲染
- 自定义过滤器
- 自定义全局函数
"""

import logging
from jinja2 import Environment, FileSystemLoader, BaseLoader
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
            template_file = self.env.loader.get_source(self.env, template_path)
            return template_file[0]
        except Exception as e:
            logger.error(f"Failed to get template source: {e}")
            return None
