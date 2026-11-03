"""Autenticação administrativa da API.

Sessões JWT expiram em 30 minutos. O limitador simples funciona por processo:
para produção comercial, use um armazenamento compartilhado (como Redis).
"""
from collections import deque
from threading import Lock
import hmac
import os
import time

import jwt
from fastapi import HTTPException, status

SESSION_TTL_SECONDS = 30 * 60
LOGIN_WINDOW_SECONDS = 5 * 60
MAX_FAILED_LOGINS = 5

_failed_attempts: dict[str, deque[float]] = {}
_attempts_lock = Lock()


def _admin_settings() -> tuple[str, str, str]:
    username = os.getenv("ADMIN_USERNAME", "").strip()
    password = os.getenv("ADMIN_PASSWORD", "")
    secret = os.getenv("ADMIN_SESSION_SECRET", "")
    if not username or not password or len(secret) < 32:
        raise HTTPException(
            status_code=503,
            detail="Painel indisponível: configure ADMIN_USERNAME, ADMIN_PASSWORD e ADMIN_SESSION_SECRET (32+ caracteres).",
        )
    return username, password, secret


def check_login_limit(client_key: str) -> None:
    now = time.monotonic()
    with _attempts_lock:
        attempts = _failed_attempts.setdefault(client_key, deque())
        while attempts and now - attempts[0] >= LOGIN_WINDOW_SECONDS:
            attempts.popleft()
        if len(attempts) >= MAX_FAILED_LOGINS:
            raise HTTPException(
                status_code=429,
                detail="Muitas tentativas de login. Tente novamente em alguns minutos.",
                headers={"Retry-After": str(LOGIN_WINDOW_SECONDS)},
            )
        # Limita o número de chaves guardadas por processo.
        if len(_failed_attempts) > 2000:
            for key in list(_failed_attempts):
                if key != client_key and (
                    not _failed_attempts[key] or now - _failed_attempts[key][-1] >= LOGIN_WINDOW_SECONDS
                ):
                    del _failed_attempts[key]


def record_failed_login(client_key: str) -> None:
    with _attempts_lock:
        _failed_attempts.setdefault(client_key, deque()).append(time.monotonic())


def clear_login_failures(client_key: str) -> None:
    with _attempts_lock:
        _failed_attempts.pop(client_key, None)


def login(username: str, password: str, client_key: str) -> str:
    expected_user, expected_password, secret = _admin_settings()
    check_login_limit(client_key)
    valid_user = hmac.compare_digest(username.encode(), expected_user.encode())
    valid_password = hmac.compare_digest(password.encode(), expected_password.encode())
    if not (valid_user and valid_password):
        record_failed_login(client_key)
        raise HTTPException(status_code=401, detail="Credenciais administrativas inválidas.")
    clear_login_failures(client_key)
    now = int(time.time())
    return jwt.encode(
        {"sub": expected_user, "iat": now, "exp": now + SESSION_TTL_SECONDS},
        secret,
        algorithm="HS256",
    )


def verify_session(authorization: str | None) -> None:
    expected_user, _, secret = _admin_settings()
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Faça login para acessar o painel.")
    try:
        claims = jwt.decode(
            authorization[7:],
            secret,
            algorithms=["HS256"],
            options={"require": ["sub", "iat", "exp"]},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada. Entre novamente.") from exc
    if not hmac.compare_digest(str(claims["sub"]).encode(), expected_user.encode()):
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada. Entre novamente.")
