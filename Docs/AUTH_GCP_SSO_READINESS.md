# SENTRY Auth, GCP, and SSO Readiness

## Evaluation posture

SENTRY now has an explicit authentication boundary for local development, GCP staging, and production evaluation.

Supported modes:

| Mode | Intended use | Production allowed by default |
|---|---|---:|
| `off` | Local emergency development bypass only | No |
| `header` | Local/test identity simulation with `X-Sentry-User` | No |
| `trusted-header` | Trusted gateway that strips and injects identity headers | Yes, with shared internal assertion secret |
| `oidc` | Walmart-approved SSO/OIDC bearer token validation | Yes |
| `iap` | Google Cloud IAP assertion validation for Cloud Run | Yes |

Production startup refuses unsafe auth configuration. In particular, `SENTRY_ENV=production` with `SENTRY_AUTH_MODE=header` fails unless the explicit break-glass override is set.

## Recommended GCP launch mode

Use `SENTRY_AUTH_MODE=iap` for the first GCP launch if SENTRY is hosted on Cloud Run behind Google Cloud IAP.

Required backend environment variables:

```text
SENTRY_ENV=production
SENTRY_AUTH_MODE=iap
SENTRY_IAP_AUDIENCE=/projects/PROJECT_NUMBER/global/backendServices/BACKEND_SERVICE_ID
SENTRY_ADMIN_USERS=j0w16ja
SENTRY_ALLOWED_USERS=j0w16ja,other_user_or_email
```

Group-based access can be used instead of user allowlists when Walmart SSO/IAP claims provide stable group IDs:

```text
SENTRY_ADMIN_GROUPS=<group-id-or-claim-value>
SENTRY_ALLOWED_GROUPS=<group-id-or-claim-value>
```

## IAP configuration notes

1. Deploy Cloud Run with the normal SENTRY backend image.
2. Configure the approved GCP ingress/IAP path for the service.
3. Get the IAP JWT audience from the IAP backend service. The expected format is usually:

```text
/projects/PROJECT_NUMBER/global/backendServices/BACKEND_SERVICE_ID
```

4. Set `SENTRY_IAP_AUDIENCE` to that exact value.
5. Confirm `/api/health` returns public readiness.
6. Confirm `/api/health/authenticated` returns the signed-in user and role only after IAP login.

## OIDC configuration notes

Use `SENTRY_AUTH_MODE=oidc` only when an approved SSO entry point can provide a bearer JWT to the backend or when a backend-for-frontend/token broker is added.

Required variables:

```text
SENTRY_ENV=production
SENTRY_AUTH_MODE=oidc
SENTRY_OIDC_ISSUER=<issuer URL>
SENTRY_OIDC_AUDIENCE=<client or API audience>
SENTRY_OIDC_JWKS_URL=<issuer JWKS URL>
SENTRY_OIDC_USER_CLAIMS=preferred_username,email,upn,sub
SENTRY_OIDC_GROUPS_CLAIM=groups
SENTRY_ADMIN_USERS=<admin user or email>
```

Do not store production bearer tokens in browser localStorage or sessionStorage. Prefer IAP, httpOnly cookies, or an approved identity-aware gateway.

## Login and logout UX

SENTRY now exposes visible access controls:

- The auth gate shows a local sign-in form only in local `header` mode.
- Hosted modes show a `Sign in with SSO` action.
- The app header shows the current user, role, provider, and `Sign out` on desktop.
- The sidebar footer shows the current user and `Sign out`, including mobile drawer access.
- IAP logout defaults to `/_gcp_iap/clear_login_cookie?continue=<current page>`.
- Custom hosted login/logout URLs can be set with:

```text
VITE_SENTRY_LOGIN_URL=
VITE_SENTRY_LOGOUT_URL=
```

`VITE_SENTRY_LOGOUT_URL` may include `{returnTo}`, which SENTRY replaces with the current app URL.

## Monitoring probes

- `/api/health` is public and checks application/database readiness.
- `/api/health/authenticated` requires auth and verifies the active identity path, user mapping, and role assignment.

Use the authenticated health endpoint for staging smoke tests after SSO/IAP is configured.

## Remaining evaluation notes

- Rate limiting is in-process and should be complemented by GCP/IAP or load-balancer controls for distributed attacks.
- JWT signing keys are cached with a one-hour TTL to tolerate key rotation without requiring service restarts.
- Group membership changes take effect when the user's token/session is refreshed. Use shorter token/session lifetimes if immediate revocation is required.
- Final SSP evaluation should confirm the approved Walmart SSO/IAP path, group claim names, admin group, and session lifetime.
