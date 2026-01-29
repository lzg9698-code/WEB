"""
文件管理控制器

此文件必须严格遵循PROJECT_REQUIREMENTS.md文档约束。
任何修改都必须先更新需求文档，然后修改代码。
违反此约束将导致代码被拒绝。

职责边界：
- ✅ 文件的列出、读取、写入、删除
- ✅ 目录的创建和遍历
- ✅ 文件上传和下载
- ❌ 不负责文件内容解析（由对应模块负责）
- ❌ 不负责文件系统权限（系统级）
"""

from flask import Blueprint, request, jsonify, send_file, abort
import os
import sys
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
import mimetypes
import re
import shutil
import json
from werkzeug.utils import secure_filename

# 添加 backend 目录到 Python 路径
backend_path = Path(__file__).parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

# 创建蓝图
file_bp = Blueprint('file', __name__, url_prefix='/api/files')

logger = logging.getLogger(__name__)

# 允许访问的根目录
WORKSPACE_ROOT = Path(__file__).parent.parent.parent


class FileManager:
    """文件管理器"""

    def __init__(self, workspace_root: Optional[str] = None):
        # 确保 workspace_root 始终是 Path 对象
        if workspace_root is None:
            self.workspace_root = WORKSPACE_ROOT
        else:
            self.workspace_root = Path(workspace_root)

    def _validate_path(self, path: str) -> Path:
        """验证路径是否在允许范围内"""
        # 处理根路径，映射到 workspace
        if path == '/' or path == '':
            return self.workspace_root
        
        # 移除开头的斜杠，统一按相对路径处理
        clean_path = path.lstrip('/')
        
        # 防止路径遍历攻击
        clean_path = re.sub(r'\.\./', '', clean_path)
        clean_path = re.sub(r'^\.\/', '', clean_path)
        
        # 检查文件名安全性
        if not self._is_safe_filename(clean_path):
            raise PermissionError(f"不安全的文件名: {path}")
        
        # 拼接 workspace 根目录
        full_path = self.workspace_root / clean_path
        
        # 确保不超出 workspace
        try:
            full_path.relative_to(self.workspace_root)
        except ValueError:
            raise PermissionError(f"无权限访问路径: {path}")

        return full_path

    def _is_safe_filename(self, filename: str) -> bool:
        """检查文件名是否安全"""
        if not filename or filename in ['.', '..']:
            return False
        
        # 检查包含的每个部分
        parts = filename.split('/')
        for part in parts:
            if not part:
                continue
            if part in ['..', '.', 'CON', 'PRN', 'AUX', 'NUL', 
                       'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
                       'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']:
                return False
            # 检查Windows设备名和非法字符
            if re.search(r'[<>:"/\\|?*]', part):
                return False
        
        return True

    def list_files(self, path: str = '/') -> List[Dict[str, Any]]:
        """列出目录中的文件"""
        try:
            target_path = self._validate_path(path)

            if not target_path.exists():
                raise FileNotFoundError(f"路径不存在: {path}")

            if not target_path.is_dir():
                raise ValueError(f"路径不是目录: {path}")

            files = []
            for item in target_path.iterdir():
                stat = item.stat()
                files.append({
                    'name': item.name,
                    'path': str(item.relative_to(self.workspace_root)),
                    'isDirectory': item.is_dir(),
                    'size': stat.st_size,
                    'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    'created': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    'extension': item.suffix if item.is_file() else None
                })

            # 文件夹优先，按名称排序
            files.sort(key=lambda x: (not x['isDirectory'], x['name'].lower()))

            return files

        except PermissionError:
            raise
        except Exception as e:
            logger.error(f"列出文件失败: {path}, 错误: {str(e)}")
            raise

    def read_file(self, path: str) -> str:
        """读取文件内容"""
        target_path = self._validate_path(path)

        if not target_path.exists():
            raise FileNotFoundError(f"文件不存在: {path}")

        if not target_path.is_file():
            raise ValueError(f"路径不是文件: {path}")

        with open(target_path, 'r', encoding='utf-8') as f:
            return f.read()

    def write_file(self, path: str, content: str, create_dirs: bool = True, backup: bool = True) -> bool:
        """写入文件内容"""
        target_path = self._validate_path(path)

        # 如果文件存在且需要备份
        if target_path.exists() and backup:
            self._create_backup(target_path)

        # 创建父目录
        if create_dirs:
            target_path.parent.mkdir(parents=True, exist_ok=True)

        with open(target_path, 'w', encoding='utf-8') as f:
            f.write(content)

        return True

    def delete_file(self, path: str, recursive: bool = False) -> bool:
        """删除文件或目录"""
        target_path = self._validate_path(path)

        if not target_path.exists():
            raise FileNotFoundError(f"路径不存在: {path}")

        # 创建备份
        backup_path = self._create_backup(target_path)
        
        if target_path.is_file():
            target_path.unlink()
        else:
            if recursive:
                shutil.rmtree(target_path)
            else:
                raise ValueError(f"删除目录需要 recursive=true: {path}")

        logger.info(f'已删除: {path} -> 备份: {backup_path}')
        return True

    def _create_backup(self, path: Path) -> Optional[str]:
        """创建文件备份"""
        try:
            backup_dir = self.workspace_root / 'backups'
            backup_dir.mkdir(exist_ok=True)
            
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_name = f"{path.name}.{timestamp}"
            backup_path = backup_dir / backup_name
            
            if path.is_file():
                shutil.copy2(str(path), str(backup_path))
            elif path.is_dir():
                shutil.copytree(str(path), str(backup_path))
            
            return str(backup_path.relative_to(self.workspace_root))
        except Exception as e:
            logger.warning(f"创建备份失败: {e}")
            return None

    def create_path(self, path: str, is_directory: bool = False) -> bool:
        """创建文件或目录"""
        target_path = self._validate_path(path)

        if is_directory:
            target_path.mkdir(parents=True, exist_ok=True)
        else:
            target_path.parent.mkdir(parents=True, exist_ok=True)
            target_path.touch()

        return True

    def copy_file(self, source: str, destination: str, overwrite: bool = False) -> bool:
        """复制文件"""
        source_path = self._validate_path(source)
        dest_path = self._validate_path(destination)

        if not source_path.exists():
            raise FileNotFoundError(f"源文件不存在: {source}")

        if not source_path.is_file():
            raise ValueError(f"源路径不是文件: {source}")

        if dest_path.exists() and not overwrite:
            raise FileExistsError(f"目标文件已存在: {destination}")

        import shutil
        shutil.copy2(source_path, dest_path)

        return True

    def move_file(self, source: str, destination: str, overwrite: bool = False) -> bool:
        """移动/重命名文件"""
        source_path = self._validate_path(source)
        dest_path = self._validate_path(destination)

        if not source_path.exists():
            raise FileNotFoundError(f"源文件不存在: {source}")

        if dest_path.exists() and not overwrite:
            raise FileExistsError(f"目标文件已存在: {destination}")

        import shutil
        shutil.move(str(source_path), str(dest_path))

        return True

    def get_file_info(self, path: str) -> Dict[str, Any]:
        """获取文件信息"""
        target_path = self._validate_path(path)

        if not target_path.exists():
            raise FileNotFoundError(f"路径不存在: {path}")

        stat = target_path.stat()
        return {
            'name': target_path.name,
            'path': str(target_path.relative_to(self.workspace_root)),
            'isDirectory': target_path.is_dir(),
            'size': stat.st_size,
            'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
            'created': datetime.fromtimestamp(stat.st_ctime).isoformat(),
            'extension': target_path.suffix if target_path.is_file() else None,
            'readable': os.access(target_path, os.R_OK),
            'writable': os.access(target_path, os.W_OK)
        }

    def search_files(self, path: str, pattern: str, recursive: bool = True) -> List[Dict[str, Any]]:
        """搜索文件"""
        import re

        target_path = self._validate_path(path)

        if not target_path.exists():
            raise FileNotFoundError(f"路径不存在: {path}")

        regex = re.compile(pattern, re.IGNORECASE)
        results = []

        if recursive:
            iterator = target_path.rglob("*")
        else:
            iterator = target_path.glob("*")

        for item in iterator:
            if item.is_file() and regex.search(item.name):
                stat = item.stat()
                results.append({
                    'name': item.name,
                    'path': str(item.relative_to(self.workspace_root)),
                    'isDirectory': False,
                    'size': stat.st_size,
                    'modified': datetime.fromtimestamp(stat.st_mtime).isoformat()
                })

        return results


# 全局文件管理器实例
file_manager = FileManager()


# API 路由

@file_bp.route('', methods=['GET'])
def list_files():
    """获取文件列表"""
    try:
        path = request.args.get('path', '/')
        files = file_manager.list_files(path)

        return jsonify({
            'success': True,
            'data': files,
            'path': path,
            'timestamp': datetime.now().isoformat()
        })

    except PermissionError as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': '无权限访问指定路径'
        }), 403

    except FileNotFoundError as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': '路径不存在'
        }), 404

    except Exception as e:
        logger.error(f"列出文件失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': '获取文件列表失败'
        }), 500


@file_bp.route('/info', methods=['GET'])
def get_file_info():
    """获取文件信息"""
    try:
        path = request.args.get('path')
        if not path:
            return jsonify({
                'success': False,
                'error': '缺少path参数',
                'message': '请提供文件路径'
            }), 400

        info = file_manager.get_file_info(path)

        return jsonify({
            'success': True,
            'data': info,
            'timestamp': datetime.now().isoformat()
        })

    except FileNotFoundError as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': '文件不存在'
        }), 404

    except Exception as e:
        logger.error(f"获取文件信息失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': '获取文件信息失败'
        }), 500


@file_bp.route('', methods=['POST'])
def create_path():
    """创建文件或目录"""
    try:
        data = request.get_json()

        if not data or 'path' not in data:
            return jsonify({
                'success': False,
                'error': '缺少必要参数',
                'message': '请提供path参数'
            }), 400

        path = data['path']
        is_directory = data.get('is_directory', False)
        content = data.get('content', '')

        if not is_directory and content:
            file_manager.write_file(path, content)
        else:
            file_manager.create_path(path, is_directory)

        logger.info(f'✅ 成功创建: {path}')

        return jsonify({
            'success': True,
            'message': f"{'目录' if is_directory else '文件'}创建成功",
            'path': path,
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f'创建文件/目录失败: {e}')
        return jsonify({
            'success': False,
            'error': str(e),
            'message': '创建失败'
        }), 500


@file_bp.route('/<path:file_path>', methods=['GET'])
def read_file(file_path):
    """读取文件内容"""
    try:
        path = '/' + file_path
        content = file_manager.read_file(path)

        # 获取文件扩展名用于语法高亮
        ext = Path(path).suffix.lower()

        return jsonify({
            'success': True,
            'data': {
                'content': content,
                'path': path,
                'extension': ext,
                'encoding': 'utf-8'
            },
            'timestamp': datetime.now().isoformat()
        })

    except FileNotFoundError as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': '文件不存在'
        }), 404

    except UnicodeDecodeError:
        # 对于二进制文件，返回错误提示
        return jsonify({
            'success': False,
            'error': 'Cannot read binary file',
            'message': '无法读取二进制文件，请使用下载接口'
        }), 400

    except Exception as e:
        logger.error(f'读取文件失败: {e}')
        return jsonify({
            'success': False,
            'error': str(e),
            'message': '读取文件失败'
        }), 500


@file_bp.route('/<path:file_path>', methods=['PUT'])
def write_file(file_path):
    """写入文件内容"""
    try:
        path = '/' + file_path
        data = request.get_json()

        if not data or 'content' not in data:
            return jsonify({
                'success': False,
                'error': '缺少必要参数',
                'message': '请提供content参数'
            }), 400

        content = data['content']
        create_dirs = data.get('create_dirs', True)

        file_manager.write_file(path, content, create_dirs)

        logger.info(f'✅ 成功写入文件: {path}')

        return jsonify({
            'success': True,
            'message': '文件保存成功',
            'path': path,
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f'写入文件失败: {e}')
        return jsonify({
            'success': False,
            'error': str(e),
            'message': '保存文件失败'
        }), 500


@file_bp.route('/<path:file_path>', methods=['DELETE'])
def delete_file(file_path):
    """删除文件或目录"""
    try:
        path = '/' + file_path
        recursive = request.args.get('recursive', 'false').lower() == 'true'

        file_manager.delete_file(path, recursive)

        logger.info(f'✅ 成功删除: {path}')

        return jsonify({
            'success': True,
            'message': '删除成功',
            'path': path,
            'timestamp': datetime.now().isoformat()
        })

    except FileNotFoundError as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': '文件不存在'
        }), 404

    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': '删除目录需要recursive参数'
        }), 400

    except Exception as e:
        logger.error(f'删除文件失败: {e}')
        return jsonify({
            'success': False,
            'error': str(e),
            'message': '删除失败'
        }), 500


@file_bp.route('/copy', methods=['POST'])
def copy_file():
    """复制文件"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': '缺少数据',
                'message': '请提供复制数据'
            }), 400

        source = data.get('source')
        destination = data.get('destination')
        overwrite = data.get('overwrite', False)

        if not source or not destination:
            return jsonify({
                'success': False,
                'error': '缺少必要参数',
                'message': '请提供source和destination参数'
            }), 400

        file_manager.copy_file(source, destination, overwrite)

        logger.info(f'✅ 成功复制: {source} -> {destination}')

        return jsonify({
            'success': True,
            'message': '复制成功',
            'source': source,
            'destination': destination,
            'timestamp': datetime.now().isoformat()
        })

    except FileNotFoundError as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': '源文件不存在'
        }), 404

    except FileExistsError as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': '目标文件已存在'
        }), 409

    except Exception as e:
        logger.error(f'复制文件失败: {e}')
        return jsonify({
            'success': False,
            'error': str(e),
            'message': '复制失败'
        }), 500


@file_bp.route('/move', methods=['POST'])
def move_file():
    """移动/重命名文件"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': '缺少数据',
                'message': '请提供移动数据'
            }), 400

        source = data.get('source')
        destination = data.get('destination')
        overwrite = data.get('overwrite', False)

        if not source or not destination:
            return jsonify({
                'success': False,
                'error': '缺少必要参数',
                'message': '请提供source和destination参数'
            }), 400

        file_manager.move_file(source, destination, overwrite)

        logger.info(f'✅ 成功移动: {source} -> {destination}')

        return jsonify({
            'success': True,
            'message': '移动成功',
            'source': source,
            'destination': destination,
            'timestamp': datetime.now().isoformat()
        })

    except FileNotFoundError as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': '源文件不存在'
        }), 404

    except Exception as e:
        logger.error(f'移动文件失败: {e}')
        return jsonify({
            'success': False,
            'error': str(e),
            'message': '移动失败'
        }), 500


@file_bp.route('/search', methods=['POST'])
def search_files():
    """搜索文件"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': '缺少数据',
                'message': '请提供搜索数据'
            }), 400

        path = data.get('path', '/')
        pattern = data.get('pattern', '')
        recursive = data.get('recursive', True)

        if not pattern:
            return jsonify({
                'success': False,
                'error': '缺少必要参数',
                'message': '请提供pattern参数'
            }), 400

        results = file_manager.search_files(path, pattern, recursive)

        return jsonify({
            'success': True,
            'data': results,
            'count': len(results),
            'path': path,
            'pattern': pattern,
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f'搜索文件失败: {e}')
        return jsonify({
            'success': False,
            'error': str(e),
            'message': '搜索失败'
        }), 500


@file_bp.route('/download/<path:file_path>', methods=['GET'])
def download_file(file_path):
    """下载文件"""
    try:
        path = '/' + file_path
        target_path = file_manager._validate_path(path)

        if not target_path.exists():
            return jsonify({
                'success': False,
                'error': '文件不存在',
                'message': '要下载的文件不存在'
            }), 404

        if target_path.is_dir():
            return jsonify({
                'success': False,
                'error': 'Cannot download directory',
                'message': '不能下载目录，请先打包'
            }), 400

        logger.info(f'📥 下载文件: {path}')

        return send_file(
            str(target_path),
            as_attachment=True,
            download_name=target_path.name,
            mimetype=mimetypes.guess_type(str(target_path))[0] or 'application/octet-stream'
        )

    except Exception as e:
        logger.error(f'下载文件失败: {e}')
        return jsonify({
            'success': False,
            'error': str(e),
            'message': '下载失败'
        }), 500


@file_bp.route('/upload', methods=['POST'])
def upload_file():
    """上传文件"""
    try:
        path = request.form.get('path', '/')
        overwrite = request.form.get('overwrite', 'false').lower() == 'true'

        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file provided',
                'message': '请选择要上传的文件'
            }), 400

        uploaded_file = request.files['file']
        filename = uploaded_file.filename

        if not filename:
            return jsonify({
                'success': False,
                'error': 'Invalid filename',
                'message': '文件名无效'
            }), 400

        # 安全化文件名
        secure_name = secure_filename(filename)
        if not secure_name:
            return jsonify({
                'success': False,
                'error': 'Invalid filename',
                'message': '文件名包含非法字符'
            }), 400

        # 构建目标路径
        target_name = os.path.join(path, secure_name)
        target_path = file_manager._validate_path(target_name)

        # 如果文件存在且不允许覆盖
        if target_path.exists() and not overwrite:
            return jsonify({
                'success': False,
                'error': 'File exists',
                'message': '文件已存在，设置overwrite=true可覆盖'
            }), 409

        # 确保目录存在
        target_path.parent.mkdir(parents=True, exist_ok=True)

        # 保存文件
        uploaded_file.save(str(target_path))

        logger.info(f'✅ 上传成功: {target_name}')

        return jsonify({
            'success': True,
            'message': '文件上传成功',
            'filename': filename,
            'path': str(target_path.relative_to(file_manager.workspace_root)),
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f'上传文件失败: {e}')
        return jsonify({
            'success': False,
            'error': str(e),
            'message': '上传失败'
        }), 500
