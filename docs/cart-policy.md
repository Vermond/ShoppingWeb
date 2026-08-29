# 장바구니 정책

## 접근 권한

장바구니 API는 Access Token Cookie가 있는 로그인 사용자만 사용할 수 있다. 현재 인증 Guard가 `auth.users.status = 'active'`와 `email_verified = true`를 함께 확인하므로 이메일 인증을 완료하지 않은 사용자는 장바구니 API를 이용할 수 없다.

장바구니는 사용자당 하나만 존재하며, 첫 장바구니 조회 또는 상품 추가 시 생성한다.

## API

| Method | Path | 설명 |
| --- | --- | --- |
| `GET` | `/api/cart` | 현재 사용자의 장바구니 조회 |
| `POST` | `/api/cart/items` | 상품 추가. 같은 상품이면 수량을 합산 |
| `POST` | `/api/cart/merge` | 로그인 전 장바구니와 현재 장바구니 병합 |
| `PATCH` | `/api/cart/items/:productId` | 해당 상품의 수량을 지정한 값으로 변경 |
| `DELETE` | `/api/cart/items/:productId` | 해당 상품 삭제 |

상품 추가 요청:

```json
{
  "product_id": "상품 UUID",
  "quantity": 2
}
```

수량 수정 요청:

```json
{
  "quantity": 2
}
```

로그인 전 장바구니 병합 요청:

```json
{
  "items": [
    {
      "product_id": "상품 UUID",
      "quantity": 2
    },
    {
      "product_id": "다른 상품 UUID",
      "quantity": 1
    }
  ]
}
```

`items`는 최대 100개까지 보낼 수 있다. 같은 상품이 여러 번 포함되면 서버에서 먼저 수량을 합산한다. 병합은 하나의 트랜잭션으로 처리되며, 병합 대상 중 하나라도 상품 상태·재고·1회 구매 한도 검증에 실패하면 전체 병합을 반영하지 않는다.

모든 변경 API는 처리 후 최신 장바구니 전체를 반환한다.

## 수량·상품 검증

- 요청 수량은 양의 정수여야 한다.
- `active` 상태 상품만 새로 추가하거나 수량을 수정할 수 있다.
- 한 번의 주문에서 허용되는 상품 수량은 `min(stock, max_order_quantity)`다.
- 같은 상품을 추가하면 기존 수량과 요청 수량을 합산한 뒤 한도를 검증한다.
- 장바구니 단계에서는 재고를 예약하지 않는다. 주문 생성 시점에 재고를 다시 검증하고 차감한다.
- 재고 또는 1회 구매 한도가 변경되어 기존 수량이 조건을 초과하면 기존 항목을 삭제하지 않고 `available: false`로 반환한다.

수량 관련 오류 코드는 다음을 사용한다.

| 코드 | 의미 | HTTP |
| --- | --- | --- |
| `PRODUCT_NOT_FOUND` | 상품이 존재하지 않음 | 404 |
| `PRODUCT_UNAVAILABLE` | 상품이 active 상태가 아님 | 409 |
| `INSUFFICIENT_STOCK` | 현재 재고보다 수량이 많음 | 409 |
| `MAX_ORDER_QUANTITY_EXCEEDED` | 1회 구매 한도 초과 | 409 |
| `CART_ITEM_NOT_FOUND` | 사용자의 장바구니에 해당 항목이 없음 | 404 |

## 장바구니 조회 응답

```json
{
  "cart": {
    "id": "장바구니 UUID",
    "items": [
      {
        "id": "1",
        "product_id": "상품 UUID",
        "quantity": 2,
        "product": {
          "id": "상품 UUID",
          "category_id": "1",
          "name": "상품명",
          "description": "상품 설명",
          "price": "12900.00",
          "stock": 5,
          "max_order_quantity": 3,
          "status": "active",
          "image_url": "https://example.com/product.png"
        },
        "available": true,
        "unavailable_reason": null,
        "subtotal": "25800.00"
      }
    ],
    "total_quantity": 2,
    "total_price": "25800.00",
    "updated_at": "2026-01-01T00:00:00.000Z"
  }
}
```

상품이 비활성화되거나 재고·구매 한도를 초과한 항목도 장바구니에서 유지한다. 이 경우 `available`은 `false`가 되고 `unavailable_reason`에 사유를 반환한다. 전체 금액은 상품이 장바구니에 남아 있는 동안 계산되는 현재 금액이며, 구매 가능 여부는 `available`로 판단한다.

가격은 PostgreSQL `numeric(12,2)`의 정밀도를 유지하기 위해 Decimal로 계산하고 소수 둘째 자리까지 문자열로 반환한다.
