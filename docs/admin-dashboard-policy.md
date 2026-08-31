# 관리자 대시보드 API 정책

## API

```text
GET /api/admin/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD
```

`from`과 `to`는 한국 시간(`Asia/Seoul`)의 날짜로 해석한다. 두 값이 모두 없으면 이번 달 1일부터 한국 시간 기준 오늘까지 조회한다. 둘 중 하나만 입력하거나 유효하지 않은 날짜를 입력하면 `400`을 반환한다.

비교 기간은 현재 기간과 같은 일수의 직전 기간이다. 비교 기간 값이 0이고 현재 값이 0보다 큰 지표의 증감률은 수학적으로 정의할 수 없으므로 `null`을 반환한다.

## 집계 기준

- 매출: `paid`, `shipped`, `completed` 주문의 `sales.orders.total_amount` 합계
- 주문 수: `cancelled`가 아닌 주문 수
- 신규 고객: 기간 내 가입한 `active` 사용자 중 `email_verified = true`인 사용자 수
- 일별 매출: 주문 생성 시각을 `Asia/Seoul` 날짜로 변환해 집계
- 카테고리 매출: `sales.order_items.unit_price * quantity` 합계이며 배송비는 제외
- 최근 주문: 주문 상태와 관계없이 `created_at` 기준 최신 5건
- 재고 부족: 현재 `catalog.products.stock <= 10`
- 기간 내 판매 수량: `paid`, `shipped`, `completed` 주문의 상품 수량 합계

금액은 PostgreSQL `numeric` 정밀도를 유지하기 위해 소수점 둘째 자리의 문자열로 반환한다.

## 권한

`AccessTokenGuard`로 로그인·활성 계정·이메일 인증 여부를 확인한 뒤 `AdminGuard`에서 `auth.users.role = 'admin'`인지 확인한다. 비로그인은 `401`, 일반 사용자는 `403`이다.

## 데이터 구조상 한계

카테고리별 매출은 주문 당시 카테고리 스냅샷이 아니라 현재 `catalog.products.category_id`를 기준으로 계산한다. 따라서 과거 상품의 카테고리가 변경되면 과거 대시보드의 카테고리별 매출도 변경될 수 있다.

구매 전환율과 유입 채널은 방문·세션·이벤트 데이터가 없으므로 이 API에서 제공하지 않는다.
