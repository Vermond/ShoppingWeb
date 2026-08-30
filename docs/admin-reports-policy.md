# 관리자 리포트 API 정책

## API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `GET` | `/api/admin/reports` | 기간별 매출·주문·고객·상품 리포트 조회 |

모든 요청은 `access_token` HttpOnly Cookie를 사용하며 `AccessTokenGuard`와 `AdminGuard`를 통과해야 한다. 비로그인은 `401`, 일반 사용자는 `403`을 반환한다.

```text
GET /api/admin/reports?from=2026-08-01&to=2026-08-30
```

`from`, `to`는 `YYYY-MM-DD` 형식으로 함께 입력해야 하며 종료일은 포함한다. 생략하면 `Asia/Seoul` 기준 당월 1일부터 오늘까지 조회한다. 비교 기간은 현재 기간과 같은 일수의 직전 기간이다.

## 응답

응답은 다음 영역으로 구성된다.

- `period`: 현재 조회 기간
- `comparison_period`: 증감률 계산에 사용한 이전 기간
- `summary`: 총 매출, 총 주문 수, 평균 주문 금액, 신규 고객 수, 재구매율과 각 증감률
- `daily_sales`: 기간 내 날짜별 매출과 주문 수
- `category_sales`: 카테고리별 상품 매출, 판매 수량, 비율
- `top_products`: 판매 수량 상위 10개 상품

금액의 `value`, `revenue`는 PostgreSQL `numeric(12,2)`를 `Decimal`로 처리한 소수 둘째 자리 문자열이다. `change_rate_percent`는 숫자이며 이전 값이 0이면 `null`이다.

## 집계 기준

매출, 주문 수, 평균 주문 금액, 카테고리 매출, 상품 판매량, 재구매율은 `sales.orders.status`가 `paid`, `shipped`, `completed`인 주문만 사용한다. `pending`, `cancelled` 주문은 제외한다.

- 총 매출: 유효 주문의 `total_amount` 합계
- 총 주문 수: 유효 주문 수
- 평균 주문 금액: 총 매출 / 유효 주문 수. 유효 주문이 없으면 `0.00`
- 신규 고객 수: 기간 내 가입한 `auth.users.role IN ('user', 'customer')` 사용자 수. 현재 정상 role은 `user`이며 `customer`는 레거시 데이터 호환용이다. `admin`은 제외한다.
- 재구매율: 기간 내 유효 주문 이력이 있는 일반 회원 중 유효 주문이 2건 이상인 회원의 비율
- 카테고리 매출: `sales.order_items.unit_price * quantity` 합계. 배송비·할인 금액은 제외
- 상품 매출: 주문 상품의 단가와 수량 기준

상품·카테고리 집계는 현재 상품의 카테고리를 사용한다. 과거에 상품 카테고리를 변경하면 과거 리포트의 카테고리 분류도 달라질 수 있다. 주문 상품에는 카테고리 스냅샷이 없기 때문이다.

리포트 조회 성능을 위해 `backend/sql/006_admin_reports_indexes.sql`의 유효 주문 기간 부분 인덱스와 주문 상품 조인 인덱스를 운영 DB에 별도로 적용한다.

매출이 없는 카테고리도 `category_sales`에 `0.00`, `0`으로 포함한다. 모든 날짜가 `daily_sales`에 포함되며 매출·주문이 없는 날도 0으로 채운다.

## 제외 범위

유입 채널·세션·이벤트 데이터가 없으므로 포함하지 않는다. 리포트 다운로드 API도 제공하지 않는다.
