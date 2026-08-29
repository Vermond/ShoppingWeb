# 상품 상태 정책

## 허용 상태

상품 상태는 다음 네 가지 값만 사용한다.

| 상태 | 의미 |
| --- | --- |
| `active` | 공개 상품. 상품 목록과 향후 공개 상품 상세 조회 대상 |
| `inactive` | 상품 정보를 유지하지만 현재 판매하지 않는 상품 |
| `draft` | 작성·검토 중이며 아직 공개하지 않는 상품 |
| `archived` | 운영상 보관만 하고 더 이상 공개하지 않는 상품 |

`draft`는 상품 등록 작업이 아직 완료되지 않았거나 운영자가 검토 중인 상태를 뜻한다. 가격·설명·이미지 등의 정보가 최종 확정되지 않은 상품을 공개 API에 노출하지 않기 위해 사용한다.

## 공개 조회 규칙

현재 공개 상품 목록 API는 `active` 상태만 반환한다.

- count 조회와 실제 상품 조회에 같은 `status = 'active'` 조건을 적용한다.
- `inactive`, `draft`, `archived` 상품은 공개 목록의 결과와 전체 개수에 포함하지 않는다.
- 재고가 0인 `active` 상품은 목록에서 제외하지 않고 재고 수량을 0으로 반환한다. 품절 표시와 판매 가능 여부는 이후 주문 정책에서 별도로 결정한다.
- 정렬은 `created_at DESC, id DESC`를 유지한다.

공개 상품 상세 API `GET /api/products/:id`도 `active` 상태인 상품만 반환한다. 존재하지 않거나 공개 대상이 아닌 상품은 `404`로 처리한다.

```json
{
  "product": {
    "id": "상품 UUID",
    "category_id": "1",
    "name": "상품명",
    "description": "상품 설명",
    "price": "12900.00",
    "stock": 3,
    "status": "active",
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-01-01T00:00:00.000Z",
    "images": [
      {
        "id": "1",
        "image_url": "https://example.com/product.png",
        "sort_order": 0,
        "created_at": "2026-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

이미지는 `sort_order ASC, id ASC` 순서로 반환하며, 이미지의 `product_id`는 부모 상품 ID와 중복되므로 응답에서 생략한다.

관리자용 전체 상태 조회나 상태 변경 API는 이후 관리자 기능 범위에서 별도로 정의한다.

## 서버와 데이터베이스의 책임

서버는 상품 상태의 타입을 다음 네 값으로 제한하고, PostgreSQL에서 읽은 Row의 상태도 응답 변환 전에 다시 검증한다. 알 수 없는 상태가 DB에 있으면 정상 상품 응답으로 내보내지 않고 내부 오류로 처리한다.

데이터베이스에도 최종 방어선으로 CHECK 제약을 적용한다.

```sql
ALTER TABLE catalog.products
ADD CONSTRAINT products_status_check
CHECK (status IN ('active', 'inactive', 'draft', 'archived'));
```

이미 같은 이름의 제약이 있거나 반복 실행이 필요하면 적용 전에 PostgreSQL의 `pg_constraint`를 확인한다.

공개 목록이 커지면 다음과 같은 partial index를 검토할 수 있다.

```sql
CREATE INDEX products_active_created_at_id_idx
ON catalog.products (created_at DESC, id DESC)
WHERE status = 'active';
```

상세 조회에서 이미지가 많아지면 다음 인덱스도 검토한다.

```sql
CREATE INDEX product_images_product_id_sort_order_id_idx
ON catalog.product_images (product_id, sort_order ASC, id ASC);
```

## API 응답 타입

- `id`, `category_id`는 API에서 문자열로 반환한다. PostgreSQL `int8`인 `category_id`는 `pg`에서 문자열로 반환될 수 있다.
- `price`는 PostgreSQL `numeric(12,2)`의 정밀도를 보존하기 위해 `Decimal`로 처리한 뒤 API에서 항상 소수 둘째 자리까지의 문자열로 반환한다. 예: `"12900.00"`.
- `status`는 위 네 값 중 하나로 반환한다.
