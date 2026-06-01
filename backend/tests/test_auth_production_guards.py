"""Production auth posture tests."""
from __future__ import annotations

import pytest

from auth import _validate_production_config


class TestProductionAuthGuards:
    def test_production_refuses_auth_mode_off(self):
        with pytest.raises(RuntimeError, match="Refusing to start SENTRY in production with SENTRY_AUTH_MODE=off"):
            _validate_production_config(
                app_env="production",
                auth_mode="off",
                allowed_users={"admin_alice"},
                admin_users={"admin_alice"},
            )

    def test_production_header_auth_requires_allowed_users(self):
        with pytest.raises(RuntimeError, match="Production header-auth requires SENTRY_ALLOWED_USERS or SENTRY_ADMIN_USERS"):
            _validate_production_config(
                app_env="production",
                auth_mode="header",
                allowed_users=set(),
                admin_users=set(),
            )

    def test_production_header_auth_requires_admin_user(self):
        with pytest.raises(RuntimeError, match="Production header-auth requires at least one SENTRY_ADMIN_USERS entry"):
            _validate_production_config(
                app_env="production",
                auth_mode="header",
                allowed_users={"viewer_bob"},
                admin_users=set(),
            )

    def test_production_header_auth_accepts_valid_allowlists(self):
        _validate_production_config(
            app_env="production",
            auth_mode="header",
            allowed_users={"viewer_bob", "admin_alice"},
            admin_users={"admin_alice"},
        )

    def test_production_alias_prod_is_enforced(self):
        with pytest.raises(RuntimeError, match="Refusing to start SENTRY in production"):
            _validate_production_config(
                app_env="prod",
                auth_mode="off",
                allowed_users={"admin_alice"},
                admin_users={"admin_alice"},
            )

    def test_development_can_explicitly_disable_auth_for_local_bypass(self):
        _validate_production_config(
            app_env="development",
            auth_mode="off",
            allowed_users=set(),
            admin_users=set(),
        )
