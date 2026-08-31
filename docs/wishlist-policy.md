# 찜 목록 정책

## API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `GET` | `/api/wishlist/items` | 현재 사용자의 찜 목록 조회 |
| `POST` | `/api/wishlist/items` | 상품을 찜 목록에 추가 |
| `DELETE` | `/api/wishlist/items/:productId` | 찜 목록에서 상품 삭제 |

모든 찜 목록 API는 Access Token Cookie 인증이 필요하다. 인증된 사용자의 `user_id`만 사용하며, 요청 본문으로 `user_id`를 받지 않는다.

## 추가

요청 본문은 다음과 같다.

```json
{
  "product_id": "상품 UUID"
}
```

상품이 존재하고 `active` 상태일 때만 추가할 수 있다. 이미 추가된 상품을 다시 요청하면 복합 기본키와 `ON CONFLICT DO NOTHING`을 이용해 기존 항목을 반환한다.

## 조회

찜 목록은 `wishlist.wishlist_items`와 `catalog.products`를 조인해 반환한다. 상품명, 가격, 재고, 상태, 대표 이미지는 현재 상품 정보이며, 찜 추가 시각은 찜 항목의 `created_at`이다.

상품 가격이나 상품명을 찜 테이블에 별도로 복사하지 않는다. 주문 시점의 상품 정보는 주문 항목에서 별도로 보존한다.

## 삭제

삭제는 인증된 사용자의 `user_id`와 경로의 `productId`가 동시에 일치하는 항목만 처리한다. 존재하지 않는 찜 항목은 `WISHLIST_ITEM_NOT_FOUND` 오류를 반환한다.
