# 공통 API 오류 응답 정책

## 기본 형식

모든 HTTP 오류 응답은 다음 형식을 기본으로 사용한다.

```json
{
  "code": "VALIDATION_ERROR",
  "message": "요청값이 올바르지 않습니다."
}
```

`statusCode`와 NestJS 기본 `error` 필드는 API 응답에 노출하지 않는다. HTTP 상태 코드는 응답 상태로 확인하고, 프론트에서 분기해야 하는 의미는 `code`로 확인한다.

Rate Limit 응답처럼 추가 정보가 필요한 경우에만 허용된 메타데이터를 함께 반환한다.

```json
{
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
  "retryAfterSeconds": 60
}
```

## 오류 코드

| HTTP 상태 | 기본 코드 | 의미 |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | 요청 형식·입력값 오류 |
| 401 | `UNAUTHORIZED` | 인증 정보가 없거나 유효하지 않음 |
| 403 | `FORBIDDEN` | 인증은 되었지만 요청 권한이 없음 |
| 404 | `NOT_FOUND` | 요청한 리소스가 없음 |
| 409 | `CONFLICT` | 현재 상태와 충돌하거나 중복됨 |
| 410 | `GONE` | 리소스가 만료되어 더 이상 사용할 수 없음 |
| 429 | `RATE_LIMIT_EXCEEDED` | 요청 횟수 제한 초과 |
| 500 | `INTERNAL_SERVER_ERROR` | 처리되지 않은 서버 오류 |
| 503 | `SERVICE_UNAVAILABLE` | 외부 서비스 또는 인프라를 사용할 수 없음 |

도메인 의미를 프론트에서 구분해야 하는 경우에는 기본 코드 대신 도메인 코드를 사용할 수 있다.

현재 사용 중인 예시는 다음과 같다.

- `EMAIL_NOT_VERIFIED`
- `USER_INACTIVE`
- `EMAIL_ALREADY_VERIFIED`는 이메일 인증 성공 응답의 결과 코드로 사용한다.
- `EMAIL_VERIFICATION_SENT`는 이메일 재전송 성공 응답의 결과 코드로 사용한다.

## 메시지 규칙

- 사용자에게 안내할 수 있는 메시지만 응답한다.
- DB 오류, Stack Trace, Secret, 토큰 원문, 내부 쿼리는 응답하지 않는다.
- 서버 내부 오류는 일반화된 메시지를 사용한다.
- 입력 검증 메시지는 현재 실패한 규칙을 설명하되, 민감한 입력값은 포함하지 않는다.
- 오류 코드로 처리할 수 있는 조건을 프론트에서 메시지 문자열로 판단하지 않는다.

## API 계층별 규칙

### Controller

- HTTP 상태 코드와 응답 형식을 결정한다.
- 요청 본문과 쿼리 입력은 허용 필드를 검증한다.
- 예외를 임의의 성공 응답으로 변환하지 않는다.

### Service

- 도메인 오류는 적절한 NestJS HTTP 예외와 도메인 코드를 사용한다.
- DB·외부 서비스의 원본 오류는 그대로 외부에 전달하지 않는다.
- 예외를 기록할 때 비밀번호, 원본 토큰, Secret을 로그에 포함하지 않는다.

### 전역 예외 필터

전역 `ApiExceptionFilter`가 모든 HTTP 예외를 공통 형식으로 변환한다.

- 문자열 예외 메시지는 기본 상태 코드로 변환한다.
- 이미 지정된 도메인 `code`는 보존한다.
- 허용되지 않은 예외 응답 필드는 제거한다.
- 처리되지 않은 예외는 `INTERNAL_SERVER_ERROR`로 변환한다.

## 특수 응답

헬스 체크의 `503` 응답은 장애 상태 자체를 표현해야 하므로 일반 오류 형식이 아닌 헬스 체크 형식을 유지한다.

```json
{
  "status": "unavailable",
  "database": "unavailable"
}
```

