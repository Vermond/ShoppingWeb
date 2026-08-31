# 관리자 고객 관리 API 정책

## API 범위

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `GET` | `/api/admin/customers` | 고객 목록·집계 조회 |
| `GET` | `/api/admin/customers/:id` | 고객 상세·주문 내역 조회 |

이번 범위에는 관리자에 의한 회원 상태 변경, 강제 탈퇴, 비밀번호 변경 API를 포함하지 않는다. 고객 상세 화면의 주문은 기존 관리자 주문 상세 화면(`/admin/orders/:id`)으로 이동한다.

## 권한과 개인정보

두 API 모두 `access_token` HttpOnly Cookie를 사용하며 `AccessTokenGuard`와 `AdminGuard`를 통과해야 한다.

- 비로그인 요청: `401 Unauthorized`
- 로그인했지만 관리자 역할이 아닌 요청: `403 Forbidden`
- 고객은 `auth.users.role = 'user'`인 사용자만 포함한다.
- 회원 상태는 DB 값을 그대로 반환하며 `active`, `withdrawn`만 허용한다. `휴면` 같은 프론트 전용 상태는 사용하지 않는다.
- 비밀번호, 비밀번호 해시, 인증 토큰은 조회·응답에서 제외한다.
- 초기 범위에서는 전화번호와 배송지를 목록·상세 응답에 포함하지 않는다.

## 고객 목록

```text
GET /api/admin/customers?search=홍길동&status=active&email_verified=true&from=2026-08-01&to=2026-08-30&sort=total_spent_desc&page=1&page_size=20
```

지원하는 조건은 다음과 같다.

- `search`: 고객명, 이메일, 고객 ID 부분 검색
- `status`: `active`, `withdrawn`
- `email_verified`: `true`, `false`
- `from`, `to`: 가입일 기준의 서울 현지 날짜. 두 값은 함께 입력하며 종료일은 포함한다.
- `sort`: `created_at_desc`, `created_at_asc`, `order_count_desc`, `total_spent_desc`, `last_order_at_desc`
- `page`: 기본값 `1`
- `page_size`: 기본값 `20`, 최대 `100`

응답은 `customers`, `total_count`, `status_counts`, `summary`, `pagination`으로 구성된다. `status_counts`는 검색·이메일 인증·가입일 조건은 적용하지만 선택한 `status` 조건은 제외하여 두 상태를 비교할 수 있도록 한다.

목록 고객의 `order_count`, `total_spent`, `last_order_at`은 `sales.orders.status`가 `paid`, `shipped`, `completed`인 주문만 사용한다. 금액은 PostgreSQL `numeric(12,2)`를 `Decimal`로 처리한 뒤 소수 둘째 자리 문자열로 반환한다.

## 요약 집계

`summary` 필드는 서버에서 다음과 같이 계산한다.

- `total_customer_count`: `role = 'user'`인 전체 고객 수
- `active_customer_count`: 그중 `status = 'active'`인 고객 수
- `new_customer_count`: 가입일이 조회 기간 안에 있는 고객 수
- `repurchase_rate_percent`: 구매 이력이 있는 고객 중 결제 완료·배송 관련 주문이 2건 이상인 고객의 비율

`from`, `to`를 생략하면 신규 고객 집계 기간은 `Asia/Seoul` 기준 이번 달 1일부터 오늘까지다. 목록 필터와 별개로 전체 고객을 대상으로 요약한다. 재구매율은 구매 고객이 없으면 `0.00`으로 반환한다.

## 고객 상세

```text
GET /api/admin/customers/00000000-0000-4000-8000-000000000000
```

고객 기본 정보와 가입·수정일, 이메일 인증 여부, 상태, 결제 완료·배송 관련 주문 기준의 주문 수·누적 구매 금액·최근 주문일, 해당 고객의 주문 목록을 반환한다. 주문 목록은 최신 주문순이며 주문 상태와 주문 금액, 주문일시, 상품 요약, 상품 수량을 포함한다. 주문 상세의 결제·배송 정보가 필요하면 기존 관리자 주문 상세 API를 사용한다.

## 인덱스와 성능

`backend/sql/005_admin_customers_indexes.sql`에 고객 역할·상태·이메일 인증·가입일, 주문 고객·상태·일시, 주문 상품 조인을 위한 인덱스를 추가했다. SQL 파일은 운영 DB에 별도로 적용해야 한다.

검색은 현재 `ILIKE '%검색어%'` 방식이다. PostgreSQL의 일반 B-tree 인덱스가 이 부분 검색에 직접 활용되지 않을 수 있으므로 고객 수가 크게 증가하면 `pg_trgm` 기반 GIN 인덱스 도입을 별도로 검토한다.

현재 주문 상품에는 주문 당시 카테고리 스냅샷이 없으므로 고객 관리 집계에는 상품 카테고리별 통계를 포함하지 않는다. 또한 결제 수단·배송 상태는 고객 API의 책임 범위가 아니며 기존 관리자 주문 API에서 제공한다.
