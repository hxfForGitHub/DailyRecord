"""配置管理"""

import os
import yaml
from typing import Optional


class Settings:
    """应用配置，从 config.yaml 加载"""

    def __init__(self, config_path: Optional[str] = None):
        if config_path is not None:
            self._config_path = config_path
        else:
            # 环境变量 > 默认查找
            env_config = os.environ.get("DAILYRECORD_CONFIG_PATH")
            env_resources = os.environ.get("DAILYRECORD_RESOURCES_PATH")

            if env_config and os.path.exists(env_config):
                self._config_path = env_config
            elif env_resources and os.path.exists(os.path.join(env_resources, "config.yaml")):
                self._config_path = os.path.join(env_resources, "config.yaml")
            else:
                self._config_path = os.path.join(self._find_project_root(), "config.yaml")

        self._data = self._load_config()

    def _find_project_root(self) -> str:
        """找到项目根目录（包含 config.yaml 的目录）"""
        current = os.path.dirname(os.path.abspath(__file__))
        for _ in range(5):
            if os.path.exists(os.path.join(current, "config.yaml")):
                return current
            current = os.path.dirname(current)
        return os.getcwd()

    def _load_config(self) -> dict:
        """加载配置文件"""
        defaults = {
            "reminder": {
                "interval_minutes": 20,
                "enabled": True,
            },
            "storage": {
                "path": self._default_data_path(),
                "format": "sqlite",
            },
            "appearance": {
                "theme": "auto",
                "language": "zh-CN",
            },
            "notification": {
                "sound": True,
            },
        }
        if os.path.exists(self._config_path):
            with open(self._config_path, "r", encoding="utf-8") as f:
                user_config = yaml.safe_load(f) or {}
            self._deep_merge(defaults, user_config)
        return defaults

    @staticmethod
    def _default_data_path() -> str:
        """获取默认数据存储路径"""
        # 生产模式：使用 ~/Library/Application Support/DailyRecord/
        if os.environ.get("DAILYRECORD_RESOURCES_PATH"):
            app_support = os.path.join(os.path.expanduser("~"), "Library", "Application Support", "DailyRecord")
            os.makedirs(app_support, exist_ok=True)
            return app_support
        # 开发模式：项目目录下的 data/
        return "./data"

    @staticmethod
    def _deep_merge(base: dict, override: dict):
        """深合并字典"""
        for key, value in override.items():
            if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                Settings._deep_merge(base[key], value)
            else:
                base[key] = value

    def save(self):
        """保存配置到文件"""
        with open(self._config_path, "w", encoding="utf-8") as f:
            yaml.dump(self._data, f, allow_unicode=True, default_flow_style=False)

    @property
    def reminder_interval(self) -> int:
        return self._data["reminder"]["interval_minutes"]

    @property
    def reminder_enabled(self) -> bool:
        return self._data["reminder"]["enabled"]

    @property
    def storage_path(self) -> str:
        return self._data["storage"]["path"]

    @property
    def storage_format(self) -> str:
        return self._data["storage"]["format"]

    @property
    def theme(self) -> str:
        return self._data["appearance"]["theme"]

    @property
    def language(self) -> str:
        return self._data["appearance"]["language"]

    @property
    def notification_sound(self) -> bool:
        return self._data["notification"]["sound"]

    def to_dict(self) -> dict:
        return self._data


settings = Settings()
