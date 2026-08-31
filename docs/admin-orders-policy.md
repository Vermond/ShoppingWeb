# 관리자 주문 관리 API 정책

## API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `GET` | `/api/admin/orders` | 관리자 주문 목록·집계 조회 |
| `GET` | `/api/admin/orders/:id` | 관리자 주문 상세 조회 |
| `PATCH` | `/api/admin/orders/:id/status` | 관리자 주문 상태 변경 |

모든 API는 Access Token Cookie 인증과 관리자 역할 검사를 통과해야 한다. 비로그인은 `401`, 로그인했지만 `role != 'admin'`인 사용자는 `403`이다.

## 주문 목록

```text
GET /api/admin/orders?from=2026-08-01&to=2026-08-30&status=paid&search=홍길동&page=1&page_size=20
```

- `from`, `to`: 한국 시간(`Asia/Seoul`) 기준 날짜이며 함께 입력해야 한다. 날짜 조건이 없으면 전체 기간을 조회한다.
- `status`: `pending`, `paid`, `shipped`, `completed`, `cancelled` 중 하나다.
- `search`: 주문 UUID, 고객명, 상품명에 대해 부분 검색한다.
- `page`: 1부터 시작하며 기본값은 `1`이다.
- `page_size`: 기본값은 `20`, 최대값은 `100`이다.
- 목록은 `created_at DESC, id DESC` 순으로 정렬한다.

`total_count`는 기간·상태·검색 조건을 모두 적용한 목록의 전체 수다. `status_counts`는 기간·검색 조건을 적용하되 상태 조건은 제외한 상태별 수다. 따라서 상태 탭을 표시할 때 각 상태의 전체 건수를 사용할 수 있다.

목록의 `product_count`는 상품 종류 수가 아니라 주문 상품의 전체 수량이다.

## 주문 상세

주문 금액과 상품 단가는 PostgreSQL `numeric(12,2)`를 `Decimal`로 읽고 API에서는 소수점 둘째 자리 문자열로 반환한다. `sales.order_addresses`의 값은 주문 당시 배송지 스냅샷이다.

현재 결제 구현은 `MockPaymentService`이며 결제수단, 결제사 승인 ID, 승인 시각을 저장하지 않는다. 상세의 `payment.provider`는 `mock`이고 해당 필드는 `null`이다. 결제 상태는 현재 주문 상태에서 파생한다.

현재 배송 테이블이나 운송장 컬럼은 없다. `shipping.status`는 주문 상태에서 파생하며 `carrier`, `tracking_number`는 `null`이다.

상품 옵션 컬럼도 현재 `sales.order_items`에 없으므로 상세 상품의 `options`는 `null`이다.

## 상태 전이

허용하는 전이는 다음과 같다.

```text
pending   -> paid, cancelled
paid      -> shipped, cancelled
shipped   -> completed
completed -> 없음
cancelled -> 없음
```

같은 상태로 변경하는 요청은 성공하는 멱등 요청으로 처리하며 이력은 추가하지 않는다. 실제 상태가 변경되면 `sales.order_status_history`에 이전 상태, 새 상태, 변경 관리자 ID를 같은 트랜잭션으로 저장한다.

상태 이력 테이블을 아직 생성하지 않았다면 `backend/sql/003_order_status_history.sql`을 먼저 실행해야 한다. 테이블 생성 전에 상세·상태 변경 API를 호출하면 서버 오류가 발생한다.

기존 주문의 과거 상태 변경 이력은 테이블 생성 이전에 알 수 없으므로 자동으로 복원하지 않는다. 기존 주문에 초기 이력을 넣으려면 실제 이력으로 확인 가능한 범위에서 별도 백필해야 한다.
