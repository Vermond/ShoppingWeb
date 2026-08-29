# 사용자 프로필·배송지 정책

## 접근 권한

프로필과 배송지 API는 Access Token Cookie가 있는 이메일 인증 완료 사용자만 사용할 수 있다. 모든 조회·수정·삭제는 인증된 현재 사용자 ID를 기준으로 처리하며, 사용자 ID를 요청 본문에서 받지 않는다.

## API

| Method | Path | 설명 |
| --- | --- | --- |
| `GET` | `/api/users/me/profile` | 현재 사용자 프로필 조회 |
| `PUT` | `/api/users/me/profile` | 전화번호 프로필 저장 또는 수정 |
| `GET` | `/api/users/me/addresses` | 배송지 목록 조회 |
| `POST` | `/api/users/me/addresses` | 배송지 추가 |
| `PATCH` | `/api/users/me/addresses/:addressId` | 배송지 수정 |
| `DELETE` | `/api/users/me/addresses/:addressId` | 배송지 삭제 |

## 프로필

전화번호는 필수이며, 서버는 공백·괄호·하이픈을 제거한 숫자 형식으로 저장한다. 전화번호를 변경할 때는 다음 요청을 사용한다.

```json
{
  "phone_number": "010-1234-5678"
}
```

## 배송지

배송지는 사용자당 여러 개를 저장할 수 있다. `is_default = true`인 기본 배송지는 사용자당 하나만 유지한다.

- 첫 배송지는 요청에서 `is_default`를 `false`로 보내도 자동으로 기본 배송지가 된다.
- 새 배송지를 기본 배송지로 지정하면 기존 기본 배송지는 해제된다.
- 기본 배송지를 삭제하면 가장 최근의 다른 배송지가 기본 배송지로 승격된다.
- 기본 배송지가 하나뿐인 상태에서 기본 지정 해제를 요청하면 `DEFAULT_ADDRESS_REQUIRED`를 반환한다.
- 주문 API는 배송지 내용을 직접 받지 않고 `address_id`를 받아 사용자 소유권을 확인한다.

배송지 추가 요청:

```json
{
  "recipient_name": "홍길동",
  "phone_number": "010-1234-5678",
  "postal_code": "06236",
  "address_line1": "서울특별시 강남구 테헤란로 1",
  "address_line2": "101호",
  "is_default": true
}
```

주문 생성 시에는 배송지 정보를 `sales.order_addresses`에 복사한다. 따라서 이후 사용자 배송지를 수정하거나 삭제해도 기존 주문의 배송지는 변경되지 않는다.
