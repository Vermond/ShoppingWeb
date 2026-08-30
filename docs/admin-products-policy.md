# 관리자 상품 관리 API 정책

## API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `GET` | `/api/admin/products` | 전체 상태 상품 목록 조회 |
| `GET` | `/api/admin/products/:id` | 전체 상태 상품 상세 조회 |
| `POST` | `/api/admin/products` | 상품 등록 |
| `PATCH` | `/api/admin/products/:id` | 상품 정보·재고·이미지 수정 |
| `PATCH` | `/api/admin/products/:id/status` | 상품 상태만 수정 |
| `PATCH` | `/api/admin/products/:id/stock` | 상품 재고만 수정 |

모든 API는 Access Token Cookie 인증과 `role = 'admin'` 검사를 통과해야 한다. 비로그인은 `401`, 일반 사용자는 `403`이다.

## 목록 조회

```text
GET /api/admin/products?search=머그&category_id=1&status=active&low_stock_threshold=10&sort=sales_desc&page=1&page_size=20
```

- `search`: 상품명 부분 검색
- `category_id`: 카테고리 ID
- `status`: `active`, `inactive`, `draft`, `archived`
- `low_stock_threshold`: 재고가 해당 값 이하인 상품만 조회
- `sort`: `created_at_desc`, `created_at_asc`, `price_desc`, `price_asc`, `stock_asc`, `stock_desc`, `sales_desc`, `sales_asc`
- `page`: 기본값 `1`
- `page_size`: 기본값 `20`, 최대 `100`

목록은 `products`와 함께 `total_count`, `status_counts`, `pagination`을 반환한다. `status_counts`는 검색·카테고리·재고 조건은 적용하지만 선택한 `status` 조건은 제외한 상태별 집계다.

판매량은 `sales.order_items`와 `sales.orders`를 기준으로 하며 `paid`, `shipped`, `completed` 주문의 수량만 합산한다. `pending`, `cancelled` 주문은 제외한다.

금액은 PostgreSQL `numeric(12,2)` 정밀도를 유지하도록 `Decimal`로 처리하고 API에서는 소수 둘째 자리 문자열로 반환한다.

## 등록·수정

상품 등록 시 `status`를 생략하면 `draft`로 저장한다. 공개 상품 API는 계속 `active` 상품만 반환하므로, 관리자 확인 없이 상품이 공개되는 것을 방지한다.

`images`는 다음 형식이다.

```json
[
  {
    "image_url": "https://example.com/product.png",
    "sort_order": 0
  }
]
```

수정 요청에서 `images`를 전달하면 기존 이미지 목록을 삭제하고 전달된 배열로 전체 교체한다. 따라서 이미지 추가·삭제·순서 변경은 원하는 최종 배열을 보내서 처리한다. 생략하면 기존 이미지를 유지한다. 파일 업로드는 지원하지 않고 URL만 저장한다.

상품 삭제 API는 제공하지 않는다. 판매 중단이나 보관은 `inactive`, `draft`, `archived` 상태 변경으로 처리한다.

## 동시 재고 수정

상품 전체 수정과 재고 전용 수정은 트랜잭션 안에서 상품 행을 `FOR UPDATE`로 잠근 뒤 변경한다. 상태 변경 API는 별도의 상태 전이 제한 없이 허용된 네 상태만 검증한다.

## 데이터 구조상 한계

현재 상품 테이블과 이미지 테이블에는 옵션, 이미지 파일 메타데이터, 재고 변경 이력이 없다. 따라서 상품 옵션은 관리하지 않으며, 이미지 URL과 정렬 순서만 저장한다. 판매량도 현재 상품 기준으로 집계되며 주문 당시 상품 정보의 별도 판매 통계 스냅샷은 없다.

관리자 목록 성능을 위해 `backend/sql/004_admin_products_indexes.sql`의 인덱스를 적용한다. 상품명 `%검색%`은 일반 B-tree 인덱스가 직접 활용되지 않을 수 있으므로, 데이터가 크게 증가하면 PostgreSQL 검색 인덱스 도입을 별도로 검토한다.
