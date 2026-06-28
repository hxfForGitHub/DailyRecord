"""配置管理"""

import os
import shutil
import yaml

from backend.core.logger import logger


def _app_support_dir() -> str:
    """获取用户可写数据目录"""
    path = os.path.join(os.path.expanduser("~"), "Library", "Application Support", "DailyRecord")
    os.makedirs(path, exist_ok=True)
    return path


def _is_production() -> bool:
    """是否生产模式（PyInstaller 打包）"""
    return bool(os.environ.get("DAILYRECORD_RESOURCES_PATH"))


def _resolve_config_path() -> str:
    """确定配置文件路径（生产模式优先用可写路径）"""
    # 生产模式：优先用 ~/Library/Application Support/DailyRecord/config.yaml
    if _is_production():
        writable_path = os.path.join(_app_support_dir(), "config.yaml")
        bundled_path = os.environ.get("DAILYRECORD_CONFIG_PATH", "")

        # 首次启动：把 app 内的配置复制到可写目录
        if not os.path.exists(writable_path) and bundled_path and os.path.exists(bundled_path):
            try:
                shutil.copy(bundled_path, writable_path)  # copy（非 copy2）不保留权限
                os.chmod(writable_path, 0o644)  # 确保可写
                logger.info(f"配置文件已从 {bundled_path} 复制到 {writable_path}")
            except Exception as e:
                logger.warning(f"配置文件复制失败: {e}")

        return writable_path

    # 开发模式：项目目录下的 config.yaml
    current = os.path.dirname(os.path.abspath(__file__))
    for _ in range(5):
        if os.path.exists(os.path.join(current, "config.yaml")):
            return os.path.join(current, "config.yaml")
        current = os.path.dirname(current)
    return os.path.join(os.getcwd(), "config.yaml")


class Settings:
    """应用配置"""

    def __init__(self):
        self._config_path = _resolve_config_path()
        self._data = self._load_config()
        logger.info(f"配置加载完成: {self._config_path}")

    def _load_config(self) -> dict:
        defaults = {
            "reminder": {"interval_minutes": 20, "enabled": True},
            "storage": {"path": self._default_data_path(), "format": "sqlite"},
            "appearance": {"theme": "auto", "language": "zh-CN"},
            "notification": {"sound": True},
        }
        if os.path.exists(self._config_path):
            with open(self._config_path, "r", encoding="utf-8") as f:
                user_config = yaml.safe_load(f) or {}
            self._deep_merge(defaults, user_config)
        # 生产模式：强制存储路径使用可写目录（config.yaml 中的路径不适用）
        if _is_production():
            defaults["storage"]["path"] = _app_support_dir()
        return defaults

    @staticmethod
    def _default_data_path() -> str:
        if _is_production():
            return _app_support_dir()
        return "./data"

    @staticmethod
    def _deep_merge(base: dict, override: dict):
        for key, value in override.items():
            if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                Settings._deep_merge(base[key], value)
            else:
                base[key] = value

    def save(self):
        with open(self._config_path, "w", encoding="utf-8") as f:
            yaml.dump(self._data, f, allow_unicode=True, default_flow_style=False)
        logger.info(f"配置已保存到 {self._config_path}")

    @property
    def reminder_interval(self) -> int:
        return self._data["reminder"]["interval_minutes"]

    @reminder_interval.setter
    def reminder_interval(self, value: int):
        self._data["reminder"]["interval_minutes"] = value

    @property
    def reminder_enabled(self) -> bool:
        return self._data["reminder"]["enabled"]

    @property
    def storage_path(self) -> str:
        return self._data["storage"]["path"]

    @property
    def notification_sound(self) -> bool:
        return self._data["notification"]["sound"]

    def to_dict(self) -> dict:
        return self._data


settings = Settings()
