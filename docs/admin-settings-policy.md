# 관리자 배송 설정 정책

## API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `GET` | `/api/admin/settings` | 현재 활성 배송 정책 조회 |
| `PATCH` | `/api/admin/settings` | 현재 활성 배송 정책의 기본 배송비·무료 배송 기준 금액 수정 |

두 API 모두 `access_token` HttpOnly Cookie 인증이 필요하며,
`AccessTokenGuard`와 `AdminGuard`를 통과해야 한다. 비로그인 사용자는 `401`,
일반 사용자는 `403`을 반환한다.

## 조회 응답

```json
{
  "shipping_policy": {
    "id": "1",
    "base_fee": "3000.00",
    "free_threshold": "50000.00",
    "is_active": true,
    "created_at": "2026-08-31T00:00:00.000Z",
    "updated_at": "2026-08-31T00:00:00.000Z"
  }
}
```

금액은 PostgreSQL `numeric(12,2)`의 정밀도를 보존하기 위해 서버 내부에서
`Decimal`로 변환하고, API에서는 소수 둘째 자리까지의 문자열로 반환한다.

## 수정 요청

`PATCH` 요청은 다음 필드 중 하나 이상을 포함해야 한다.

```json
{
  "base_fee": "3500.00",
  "free_threshold": "50000.00"
}
```

각 필드는 0 이상, 소수점 둘째 자리 이하, `numeric(12,2)` 범위 이내의 문자열이어야
한다. 알 수 없는 필드와 빈 요청은 `400`으로 거부한다.

현재 활성 정책 행을 트랜잭션 안에서 `FOR UPDATE`로 잠근 뒤 수정한다. 활성 정책이
없으면 `SHIPPING_POLICY_NOT_FOUND` 오류를 반환하며, 이 API가 비활성 정책을 새로
만들거나 활성 상태를 변경하지는 않는다.

주문 미리보기와 주문 생성은 같은 `is_active = true` 정책을 읽어 배송비를 계산한다.
