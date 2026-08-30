# 비밀번호 재설정 정책

## API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `POST` | `/api/auth/password-reset/request` | 비밀번호 재설정 이메일 요청 |
| `POST` | `/api/auth/password-reset/confirm` | 재설정 토큰으로 비밀번호 변경 |

두 API는 로그인하지 않은 상태에서도 사용할 수 있다. 요청 API는 이메일 존재 여부를 노출하지 않으며, 입력값이 유효하면 항상 같은 성공 메시지를 반환한다.

## 재설정 이메일 요청

요청 본문은 다음과 같다.

```json
{
  "email": "user@example.com"
}
```

활성 사용자에 대해서만 기존 미사용 토큰을 무효화하고 새 토큰을 발급한다. 원본 토큰은 이메일로만 전송하고, DB에는 SHA-256 해시를 저장한다.

재설정 링크는 다음 형식이다.

```text
${FRONTEND_URL}/auth/reset-password?token=...
```

## 비밀번호 변경

요청 본문은 다음과 같다.

```json
{
  "token": "이메일 링크의 원본 토큰",
  "new_password": "새로운비밀번호"
}
```

토큰 검증, 사용자 비밀번호 변경, 토큰 사용 처리, 기존 토큰 무효화, Refresh Token 전체 폐기는 하나의 트랜잭션으로 처리한다. 새 비밀번호는 기존 `PasswordService`의 `scrypt` 방식으로 해시한다.

성공하면 인증 쿠키를 삭제하고 다시 로그인하도록 안내한다. 비밀번호 변경으로 이메일 인증 상태는 변경하지 않는다.

토큰은 한 번만 사용할 수 있으며, 만료된 토큰은 `PASSWORD_RESET_TOKEN_EXPIRED`, 사용된 토큰은 `PASSWORD_RESET_TOKEN_USED`, 존재하지 않는 토큰은 `PASSWORD_RESET_TOKEN_INVALID` 코드로 반환한다.
