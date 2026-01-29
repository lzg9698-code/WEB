"""
渲染缓存系统

严格遵循PROJECT_REQUIREMENTS.md文档约束

功能：
- 模板渲染结果缓存
- 语法验证结果缓存
- 变量提取结果缓存
- 智能缓存失效
"""

import hashlib
import time
import threading
from typing import Dict, Any, Optional, Tuple
from dataclasses import dataclass
from pathlib import Path
import json
import os

@dataclass
class CacheEntry:
    """缓存条目"""
    data: Any
    timestamp: float
    ttl: int  # Time to live in seconds
    hits: int = 0
    
    def is_expired(self) -> bool:
        """检查缓存是否过期"""
        return time.time() > (self.timestamp + self.ttl)
    
    def access(self) -> Any:
        """访问缓存，增加命中次数"""
        self.hits += 1
        return self.data

class RenderCache:
    """渲染缓存管理器"""
    
    def __init__(self, cache_dir: str = "cache", max_size: int = 1000):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
        self.max_size = max_size
        
        # 内存缓存
        self.memory_cache: Dict[str, CacheEntry] = {}
        self.cache_stats = {
            'hits': 0,
            'misses': 0,
            'evictions': 0,
            'size': 0
        }
        
        # 线程锁
        self.lock = threading.RLock()
        
        # 默认TTL设置
        self.default_ttls = {
            'render': 300,      # 5分钟
            'validate': 600,    # 10分钟
            'variables': 1200,   # 20分钟
            'preview': 60,      # 1分钟
            'syntax': 300        # 5分钟
        }
    
    def _generate_key(self, prefix: str, data: Dict[str, Any]) -> str:
        """生成缓存键"""
        # 创建数据哈希
        data_str = json.dumps(data, sort_keys=True)
        hash_value = hashlib.md5(data_str.encode()).hexdigest()
        return f"{prefix}:{hash_value}"
    
    def _get_cache_file(self, key: str) -> Path:
        """获取缓存文件路径"""
        return self.cache_dir / f"{key}.json"
    
    def _load_from_disk(self, key: str) -> Optional[CacheEntry]:
        """从磁盘加载缓存"""
        try:
            cache_file = self._get_cache_file(key)
            if not cache_file.exists():
                return None
            
            with open(cache_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return CacheEntry(**data)
        except Exception:
            return None
    
    def _save_to_disk(self, key: str, entry: CacheEntry) -> None:
        """保存缓存到磁盘"""
        try:
            cache_file = self._get_cache_file(key)
            data = {
                'data': entry.data,
                'timestamp': entry.timestamp,
                'ttl': entry.ttl,
                'hits': entry.hits
            }
            
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(data, f)
        except Exception:
            pass
    
    def _evict_expired(self) -> None:
        """清理过期缓存"""
        current_time = time.time()
        expired_keys = []
        
        for key, entry in self.memory_cache.items():
            if entry.is_expired():
                expired_keys.append(key)
        
        for key in expired_keys:
            del self.memory_cache[key]
            self.cache_stats['evictions'] += 1
            
            # 删除磁盘文件
            try:
                cache_file = self._get_cache_file(key)
                if cache_file.exists():
                    cache_file.unlink()
            except Exception:
                pass
    
    def _evict_lru(self) -> None:
        """清理最少使用的缓存项"""
        if len(self.memory_cache) <= self.max_size:
            return
        
        # 按访问次数排序
        sorted_items = sorted(
            self.memory_cache.items(),
            key=lambda x: x[1].hits
        )
        
        # 删除最不常用的项
        to_evict = len(self.memory_cache) - self.max_size + 100
        for i in range(to_evict):
            if i < len(sorted_items):
                key = sorted_items[i][0]
                del self.memory_cache[key]
                self.cache_stats['evictions'] += 1
                
                # 删除磁盘文件
                try:
                    cache_file = self._get_cache_file(key)
                    if cache_file.exists():
                        cache_file.unlink()
                except Exception:
                    pass
    
    def get(self, cache_type: str, data: Dict[str, Any]) -> Optional[Any]:
        """获取缓存数据"""
        key = self._generate_key(cache_type, data)
        
        with self.lock:
            # 检查内存缓存
            if key in self.memory_cache:
                entry = self.memory_cache[key]
                if not entry.is_expired():
                    self.cache_stats['hits'] += 1
                    return entry.access()
                else:
                    # 删除过期项
                    del self.memory_cache[key]
                    self.cache_stats['evictions'] += 1
            
            # 检查磁盘缓存
            entry = self._load_from_disk(key)
            if entry and not entry.is_expired():
                self.memory_cache[key] = entry
                self.cache_stats['hits'] += 1
                self.cache_stats['size'] = len(self.memory_cache)
                return entry.access()
            
            self.cache_stats['misses'] += 1
            return None
    
    def set(self, cache_type: str, data: Dict[str, Any], result: Any, ttl: Optional[int] = None) -> None:
        """设置缓存数据"""
        key = self._generate_key(cache_type, data)
        
        if ttl is None:
            ttl = self.default_ttls.get(cache_type, 300)
        
        entry = CacheEntry(
            data=result,
            timestamp=time.time(),
            ttl=ttl
        )
        
        with self.lock:
            self.memory_cache[key] = entry
            self._save_to_disk(key, entry)
            self.cache_stats['size'] = len(self.memory_cache)
            
            # 清理策略
            self._evict_expired()
            self._evict_lru()
    
    def invalidate(self, cache_type: Optional[str] = None, pattern: Optional[str] = None) -> None:
        """失效缓存"""
        with self.lock:
            keys_to_remove = []
            
            for key in self.memory_cache.keys():
                should_remove = False
                
                if cache_type and key.startswith(f"{cache_type}:"):
                    should_remove = True
                elif pattern and pattern in key:
                    should_remove = True
                
                if should_remove:
                    keys_to_remove.append(key)
            
            for key in keys_to_remove:
                del self.memory_cache[key]
                self.cache_stats['evictions'] += 1
                
                # 删除磁盘文件
                try:
                    cache_file = self._get_cache_file(key)
                    if cache_file.exists():
                        cache_file.unlink()
                except Exception:
                    pass
    
    def clear(self) -> None:
        """清空所有缓存"""
        with self.lock:
            self.memory_cache.clear()
            self.cache_stats['evictions'] += self.cache_stats['size']
            self.cache_stats['size'] = 0
            
            # 删除所有磁盘文件
            try:
                for cache_file in self.cache_dir.glob("*.json"):
                    cache_file.unlink()
            except Exception:
                pass
    
    def get_stats(self) -> Dict[str, Any]:
        """获取缓存统计信息"""
        total_requests = self.cache_stats['hits'] + self.cache_stats['misses']
        hit_rate = (self.cache_stats['hits'] / total_requests * 100) if total_requests > 0 else 0
        
        return {
            **self.cache_stats,
            'hit_rate': round(hit_rate, 2),
            'total_requests': total_requests
        }
    
    def cleanup(self) -> None:
        """清理缓存目录"""
        try:
            for cache_file in self.cache_dir.glob("*.json"):
                if cache_file.is_file():
                    cache_file.unlink()
        except Exception:
            pass

# 全局缓存实例
_render_cache = RenderCache()

def get_render_cache() -> RenderCache:
    """获取全局渲染缓存实例"""
    return _render_cache