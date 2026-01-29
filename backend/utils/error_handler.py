"""
统一错误处理装饰器

此文件必须严格遵循PROJECT_REQUIREMENTS.md文档约束。
任何修改都必须先更新需求文档，然后修改代码。
违反此约束将导致代码被拒绝。

职责边界：
- ✅ 统一API错误处理格式
- ✅ 记录错误日志
- ✅ 防止敏感信息泄露
- ❌ 不负责具体业务逻辑
"""

from functools import wraps
import logging
import traceback
import re
from flask import jsonify
from typing import Callable, Any, Optional, Dict, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)

class ApiError(Exception):
    """自定义API错误类"""
    def __init__(self, message: str, status_code: int = 400, error_code: Optional[str] = None):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        super().__init__(self.message)

def sanitize_error_message(error: Exception) -> str:
    """清理错误消息，防止敏感信息泄露"""
    message = str(error)
    
    # 移除可能的敏感信息
    sensitive_patterns = [
        r'password[\'"=]*\s*[:=]\s*[\'"]*[^\'"\s]*',
        r'token[\'"=]*\s*[:=]\s*[\'"]*[^\'"\s]*',
        r'secret[\'"=]*\s*[:=]\s*[\'"]*[^\'"\s]*',
        r'key[\'"=]*\s*[:=]\s*[\'"]*[^\'"\s]*',
        r'file[\'"=]*\s*[:=]\s*[\'"]*[^\'"\s]*',
    ]
    
    for pattern in sensitive_patterns:
        message = re.sub(pattern, '[REDACTED]', message, flags=re.IGNORECASE)
    
    return message

def handle_errors(f: Callable) -> Callable:
    """
    统一错误处理装饰器
    
    自动处理以下错误类型：
    - ValueError: 400 Bad Request
    - TypeError: 400 Bad Request  
    - FileNotFoundError: 404 Not Found
    - PermissionError: 403 Forbidden
    - FileExistsError: 409 Conflict
    - ApiError: 使用自定义状态码
    - 其他: 500 Internal Server Error
    """
    @wraps(f)
    def decorated_function(*args, **kwargs) -> Tuple[Dict[str, Any], int]:
        try:
            return f(*args, **kwargs)
            
        except ValueError as e:
            logger.warning(f"参数验证错误: {str(e)}")
            return {
                'success': False,
                'error': 'Validation Error',
                'message': str(e),
                'error_code': 'VALIDATION_ERROR',
                'timestamp': datetime.now().isoformat()
            }, 400
            
        except TypeError as e:
            logger.warning(f"参数类型错误: {str(e)}")
            return {
                'success': False,
                'error': 'Type Error',
                'message': '参数类型错误',
                'error_code': 'TYPE_ERROR',
                'timestamp': datetime.now().isoformat()
            }, 400
            
        except FileNotFoundError as e:
            logger.info(f"资源不存在: {str(e)}")
            return {
                'success': False,
                'error': 'Not Found',
                'message': '请求的资源不存在',
                'error_code': 'NOT_FOUND',
                'timestamp': datetime.now().isoformat()
            }, 404
            
        except PermissionError as e:
            logger.warning(f"权限错误: {str(e)}")
            return {
                'success': False,
                'error': 'Forbidden',
                'message': '无权限执行此操作',
                'error_code': 'PERMISSION_DENIED',
                'timestamp': datetime.now().isoformat()
            }, 403
            
        except FileExistsError as e:
            logger.warning(f"资源冲突: {str(e)}")
            return {
                'success': False,
                'error': 'Conflict',
                'message': '资源已存在或冲突',
                'error_code': 'RESOURCE_CONFLICT',
                'timestamp': datetime.now().isoformat()
            }, 409
            
        except ApiError as e:
            logger.warning(f"API错误: {str(e)}")
            return {
                'success': False,
                'error': 'API Error',
                'message': e.message,
                'error_code': e.error_code or 'API_ERROR',
                'timestamp': datetime.now().isoformat()
            }, e.status_code
            
        except Exception as e:
            # 记录完整错误信息用于调试
            logger.error(f"未处理的错误: {str(e)}\n{traceback.format_exc()}")
            
            # 返回安全的错误消息
            safe_message = sanitize_error_message(e)
            
            return {
                'success': False,
                'error': 'Internal Server Error',
                'message': safe_message if safe_message else '服务器内部错误',
                'error_code': 'INTERNAL_ERROR',
                'timestamp': datetime.now().isoformat()
            }, 500
    
    return decorated_function

def log_api_call(f: Callable) -> Callable:
    """API调用日志装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        start_time = datetime.now()
        
        try:
            result = f(*args, **kwargs)
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            # 记录成功的API调用
            logger.info(f"API调用成功: {f.__name__} | 耗时: {duration:.3f}s")
            
            return result
            
        except Exception as e:
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            # 记录失败的API调用
            logger.error(f"API调用失败: {f.__name__} | 耗时: {duration:.3f}s | 错误: {str(e)}")
            
            raise e
    
    return decorated_function

def validate_json_content(f: Callable) -> Callable:
    """JSON内容验证装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        from flask import request
        
        if request.is_json and request.get_json() is None:
            raise ApiError('无效的JSON格式', 400, 'INVALID_JSON')
            
        # 检查JSON大小（防止DoS攻击）
        content_length = request.content_length or 0
        if content_length > 10 * 1024 * 1024:  # 10MB限制
            raise ApiError('请求内容过大', 413, 'PAYLOAD_TOO_LARGE')
            
        return f(*args, **kwargs)
    
    return decorated_function