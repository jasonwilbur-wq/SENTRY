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

    def test_production_header_auth_requires_allowed_users_when_break_glass_enabled(self):
        with pytest.raises(RuntimeError, match="Production header-auth requires SENTRY_ALLOWED_USERS or SENTRY_ADMIN_USERS"):
            _validate_production_config(
                app_env="production",
                auth_mode="header",
                allowed_users=set(),
                admin_users=set(),
                allow_header_auth_in_production=True,
            )

    def test_production_header_auth_requires_admin_user_when_break_glass_enabled(self):
        with pytest.raises(RuntimeError, match="Production header-auth requires at least one SENTRY_ADMIN_USERS entry"):
            _validate_production_config(
                app_env="production",
                auth_mode="header",
                allowed_users={"viewer_bob"},
                admin_users=set(),
                allow_header_auth_in_production=True,
            )

    def test_production_header_auth_is_refused_by_default_even_with_allowlists(self):
        with pytest.raises(RuntimeError, match="client-spoofable"):
            _validate_production_config(
                app_env="production",
                auth_mode="header",
                allowed_users={"viewer_bob", "admin_alice"},
                admin_users={"admin_alice"},
            )

    def test_production_header_auth_requires_explicit_break_glass_override(self):
        _validate_production_config(
            app_env="production",
            auth_mode="header",
            allowed_users={"viewer_bob", "admin_alice"},
            admin_users={"admin_alice"},
            allow_header_auth_in_production=True,
        )

    def test_production_oidc_requires_provider_config(self):
        with pytest.raises(RuntimeError, match="Production OIDC auth requires"):
            _validate_production_config(
                app_env="production",
                auth_mode="oidc",
                allowed_users={"viewer_bob"},
                admin_users={"admin_alice"},
            )

    def test_production_oidc_accepts_gcp_or_sso_config(self):
        _validate_production_config(
            app_env="production",
            auth_mode="oidc",
            allowed_users={"viewer_bob"},
            admin_users={"admin_alice"},
            oidc_issuer="https://accounts.google.com",
            oidc_audience="sentry-client-id.apps.googleusercontent.com",
            oidc_jwks_url="https://www.googleapis.com/oauth2/v3/certs",
        )

    def test_production_iap_requires_audience(self):
        with pytest.raises(RuntimeError, match="Production IAP auth requires SENTRY_IAP_AUDIENCE"):
            _validate_production_config(
                app_env="production",
                auth_mode="iap",
                allowed_users={"viewer_bob"},
                admin_users={"admin_alice"},
            )

    def test_production_iap_accepts_gcp_audience(self):
        _validate_production_config(
            app_env="production",
            auth_mode="iap",
            allowed_users={"viewer_bob"},
            admin_users={"admin_alice"},
            iap_audience="/projects/123456/global/backendServices/7890",
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

    def test_hosted_auth_modes_add_router_read_dependencies(self, monkeypatch):
        import auth

        monkeypatch.setattr(auth, "APP_ENV", "production")
        monkeypatch.setattr(auth, "AUTH_MODE", "iap")
        assert auth.protected_read_dependencies()

    def test_local_header_mode_preserves_dev_read_ergonomics(self, monkeypatch):
        import auth

        monkeypatch.setattr(auth, "APP_ENV", "development")
        monkeypatch.setattr(auth, "AUTH_MODE", "header")
        assert auth.protected_read_dependencies() == []
