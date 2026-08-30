# 인증·세션 정책

## 기본 원칙

인증은 Access Token과 Refresh Token을 함께 사용하는 방식으로 처리한다. 브라우저에는 두 토큰을 HttpOnly Cookie로 저장하고, Refresh Token의 상태는 PostgreSQL에서 관리한다.

로그인마다 하나의 세션을 만들며, 여러 기기에서 동시에 로그인할 수 있다. 각 로그인 세션은 서로 독립적으로 폐기한다. `session_id`는 물리적인 기기 자체가 아니라 하나의 로그인 세션을 식별한다.

## Access Token

- JWT로 발급한다.
- Access Token 전용 Secret을 사용한다.
- Payload에는 사용자 ID(`sub`)와 토큰 종류(`type=access`)를 포함한다.
- 만료시간은 `AUTH_ACCESS_TOKEN_TTL`로 관리한다.
- 보호 API 요청마다 JWT 서명과 토큰 종류를 검증한다.
- 검증 후 DB에서 사용자를 조회하여 `status=active`이고 `email_verified=true`인지 확인한다.
- 탈퇴·비활성화·이메일 인증 취소 사용자는 기존 Access Token이 남아 있어도 접근할 수 없다.

일반 로그아웃 시 이미 발급된 Access Token은 즉시 블랙리스트에 등록하지 않는다. Cookie를 삭제하고 Refresh Token을 폐기하며, Access Token은 남은 만료시간 동안만 유효하다. 현재 설정 기준 최대 유효시간은 15분이다.

## Refresh Token

- JWT로 발급한다.
- Access Token과 다른 Secret을 사용한다.
- Payload에는 사용자 ID(`sub`), 토큰 ID(`jti`), 토큰 종류(`type=refresh`)를 포함한다.
- 원본 토큰은 DB에 저장하지 않고 SHA-256 해시만 저장한다.
- DB의 `expires_at`과 JWT 만료시간을 모두 검증한다.
- Refresh Token은 DB에 존재하며, 사용자 ID와 토큰 해시가 일치해야 유효하다.

## 세션과 Rotation

`auth.refresh_tokens.session_id`는 한 기기의 로그인 세션을 식별한다.

- 로그인 시 새로운 `session_id`를 생성한다.
- Rotation으로 발급되는 새 Refresh Token은 기존 토큰과 동일한 `session_id`를 사용한다.
- 기존 토큰 폐기와 새 토큰 저장은 하나의 DB 트랜잭션에서 처리한다.
- 정상 로그아웃은 해당 `session_id`의 활성 Refresh Token만 폐기한다.
- 다른 기기의 세션은 유지한다.

기존 `session_id`가 없는 토큰은 마이그레이션 시 자신의 토큰 ID를 세션 ID로 사용한다. 따라서 기존 토큰은 각각 독립 세션으로 보존된다.

## 폐기 토큰 재사용

Rotation으로 이미 폐기된 Refresh Token이 다시 사용되면 토큰 탈취 가능성이 있는 것으로 간주한다.

- 요청을 `401 Unauthorized`로 거부한다.
- 해당 `session_id`의 활성 Refresh Token을 모두 폐기한다.
- Access Token·Refresh Token을 새로 발급하지 않는다.
- 사용자는 다시 로그인해야 한다.

정상적인 로그아웃으로 폐기된 토큰을 재사용한 경우에도 같은 세션은 이미 폐기된 상태이므로 새 토큰을 발급하지 않는다.

## 사용자 상태 변경에 따른 세션 처리

| 작업 | 세션 처리 |
| --- | --- |
| 이름 변경 | 기존 세션 유지 |
| 이메일 변경 | 모든 Refresh Token 폐기 및 이메일 재인증 요구 |
| 비밀번호 변경 | 동일 비밀번호 재사용을 거부하고 모든 Refresh Token 폐기 |
| 이메일 미인증 상태로 Refresh 요청 | 모든 Refresh Token 폐기 |
| 탈퇴 | 모든 Refresh Token 폐기 |

이메일 변경과 비밀번호 변경은 계정 탈취 가능성이 있는 보안 이벤트이므로 모든 기기에서 다시 로그인하도록 한다.

## Cookie 정책

- Access Token과 Refresh Token은 HttpOnly Cookie로 저장한다.
- Cookie `Path`는 `/`로 설정한다.
- 운영 환경에서는 `Secure=true`를 사용한다.
- 기본 `SameSite` 정책은 `lax`로 사용한다.
- Cookie 이름은 `AUTH_ACCESS_COOKIE_NAME`, `AUTH_REFRESH_COOKIE_NAME`으로 관리한다.
- Refresh 실패 시 Access·Refresh Cookie를 모두 삭제한다.
- 로그아웃 시 토큰 유무와 관계없이 두 Cookie를 삭제하고 멱등적으로 성공 처리한다.

## 관련 환경변수

- `AUTH_ACCESS_TOKEN_SECRET`
- `AUTH_REFRESH_TOKEN_SECRET`
- `AUTH_ACCESS_TOKEN_TTL`
- `AUTH_REFRESH_TOKEN_TTL`
- `AUTH_ACCESS_COOKIE_NAME`
- `AUTH_REFRESH_COOKIE_NAME`
- `AUTH_COOKIE_SECURE`
- `AUTH_COOKIE_SAME_SITE`
