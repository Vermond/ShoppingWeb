import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CART_ITEM_UNAVAILABLE_REASONS,
  type CartItemUnavailableReason,
} from '../cart/cart.types';
import { MAX_CART_MERGE_ITEMS } from '../cart/cart.input';
import {
  PRODUCT_STATUSES,
  type ProductStatus,
} from '../products/products.types';
import { ORDER_STATUSES, type OrderStatus } from '../orders/orders.types';

export class ApiErrorResponseDto {
  @ApiProperty({ example: 'VALIDATION_ERROR' })
  code!: string;

  @ApiProperty({ example: '요청값이 올바르지 않습니다.' })
  message!: string;

  @ApiPropertyOptional({
    example: 60,
    description: '다음 요청까지 대기해야 하는 시간(초)',
  })
  retryAfterSeconds?: number;
}

export class ProductResponseDto {
  @ApiProperty({ description: '상품 ID' })
  id!: string;

  @ApiProperty({ description: '카테고리 ID' })
  category_id!: string;

  @ApiProperty({ description: '상품명' })
  name!: string;

  @ApiPropertyOptional({ nullable: true, description: '상품 설명' })
  description!: string | null;

  @ApiProperty({
    type: String,
    example: '12900.00',
    pattern: '^\\d+\\.\\d{2}$',
    description:
      '상품 가격. 정확한 금액 보존을 위해 decimal 문자열로 반환합니다.',
  })
  price!: string;

  @ApiProperty({ description: '재고 수량' })
  stock!: number;

  @ApiProperty({
    description: '한 번의 주문에서 구매 가능한 최대 수량',
  })
  max_order_quantity!: number;

  @ApiProperty({ enum: [...PRODUCT_STATUSES], description: '상품 상태' })
  status!: ProductStatus;

  @ApiProperty({ format: 'date-time', description: '생성 시각' })
  created_at!: string;

  @ApiProperty({ format: 'date-time', description: '수정 시각' })
  updated_at!: string;
}

export class CartProductResponseDto extends ProductResponseDto {
  @ApiPropertyOptional({
    format: 'uri',
    nullable: true,
    description: '대표 이미지 URL',
  })
  image_url!: string | null;
}

export class CartItemResponseDto {
  @ApiProperty({ description: '장바구니 항목 ID' })
  id!: string;

  @ApiProperty({ format: 'uuid', description: '상품 ID' })
  product_id!: string;

  @ApiProperty({ description: '장바구니 수량' })
  quantity!: number;

  @ApiProperty({ type: CartProductResponseDto, nullable: true })
  product!: CartProductResponseDto | null;

  @ApiProperty({ description: '현재 구매 가능 여부' })
  available!: boolean;

  @ApiProperty({
    enum: [...CART_ITEM_UNAVAILABLE_REASONS],
    nullable: true,
    description: '구매 불가 사유',
  })
  unavailable_reason!: CartItemUnavailableReason | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '25800.00',
    pattern: '^\\d+\\.\\d{2}$',
    description: '상품 소계',
  })
  subtotal!: string | null;
}

export class CartResponseDto {
  @ApiProperty({ format: 'uuid', description: '장바구니 ID' })
  id!: string;

  @ApiProperty({ type: [CartItemResponseDto] })
  items!: CartItemResponseDto[];

  @ApiProperty({ description: '전체 상품 수량' })
  total_quantity!: number;

  @ApiProperty({
    type: String,
    example: '25800.00',
    pattern: '^\\d+\\.\\d{2}$',
    description: '장바구니 전체 금액',
  })
  total_price!: string;

  @ApiProperty({ format: 'date-time', description: '수정 시각' })
  updated_at!: string;
}

export class CartEnvelopeResponseDto {
  @ApiProperty({ type: CartResponseDto })
  cart!: CartResponseDto;
}

export class AddCartItemBodyDto {
  @ApiProperty({ format: 'uuid', description: '추가할 상품 ID' })
  product_id!: string;

  @ApiProperty({ minimum: 1, description: '추가할 수량' })
  quantity!: number;
}

export class UpdateCartItemBodyDto {
  @ApiProperty({ minimum: 1, description: '변경할 수량' })
  quantity!: number;
}

export class MergeCartBodyDto {
  @ApiProperty({
    type: [AddCartItemBodyDto],
    maxItems: MAX_CART_MERGE_ITEMS,
    description: '로그인 전 장바구니 상품 목록',
  })
  items!: AddCartItemBodyDto[];
}

export class ProductImageResponseDto {
  @ApiProperty({ description: '이미지 ID' })
  id!: string;

  @ApiProperty({ format: 'uri', description: '이미지 URL' })
  image_url!: string;

  @ApiProperty({ description: '이미지 정렬 순서' })
  sort_order!: number;

  @ApiProperty({ format: 'date-time', description: '생성 시각' })
  created_at!: string;
}

export class ProductDetailResponseDto extends ProductResponseDto {
  @ApiProperty({ type: [ProductImageResponseDto] })
  images!: ProductImageResponseDto[];
}

export class CategoryResponseDto {
  @ApiProperty({
    type: String,
    example: '1',
    description: '카테고리 ID',
  })
  id!: string;

  @ApiProperty({ description: '카테고리명' })
  name!: string;

  @ApiProperty({ format: 'date-time', description: '생성 시각' })
  created_at!: string;

  @ApiProperty({ format: 'date-time', description: '수정 시각' })
  updated_at!: string;
}

export class UserResponseDto {
  @ApiProperty({ format: 'uuid', description: '사용자 ID' })
  id!: string;

  @ApiProperty({ format: 'email', description: '이메일 주소' })
  email!: string;

  @ApiProperty({ description: '사용자명' })
  name!: string;

  @ApiProperty({ description: '사용자 역할' })
  role!: string;

  @ApiProperty({ description: '계정 상태' })
  status!: string;

  @ApiProperty({ description: '이메일 인증 여부' })
  email_verified!: boolean;

  @ApiProperty({ format: 'date-time', description: '생성 시각' })
  created_at!: string;

  @ApiProperty({ format: 'date-time', description: '수정 시각' })
  updated_at!: string;
}

export class ProductPaginationDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 125 })
  totalItems!: number;

  @ApiProperty({ example: 7 })
  totalPages!: number;

  @ApiProperty({ example: true })
  hasNextPage!: boolean;

  @ApiProperty({ example: false })
  hasPreviousPage!: boolean;
}

export class ProductsResponseDto {
  @ApiProperty({ type: [ProductResponseDto] })
  products!: ProductResponseDto[];

  @ApiProperty({ type: ProductPaginationDto })
  pagination!: ProductPaginationDto;
}

export class ProductEnvelopeResponseDto {
  @ApiProperty({ type: ProductDetailResponseDto })
  product!: ProductDetailResponseDto;
}

export class CategoriesResponseDto {
  @ApiProperty({ type: [CategoryResponseDto] })
  categories!: CategoryResponseDto[];
}

export class UserAddressResponseDto {
  @ApiProperty({ format: 'uuid', description: '배송지 ID' })
  id!: string;

  @ApiProperty({ description: '수령인 이름' })
  recipient_name!: string;

  @ApiProperty({ description: '배송 연락처' })
  phone_number!: string;

  @ApiProperty({ description: '우편번호' })
  postal_code!: string;

  @ApiProperty({ description: '기본 주소' })
  address_line1!: string;

  @ApiPropertyOptional({ nullable: true, description: '상세 주소' })
  address_line2!: string | null;

  @ApiProperty({ description: '기본 배송지 여부' })
  is_default!: boolean;

  @ApiProperty({ format: 'date-time', description: '생성 시각' })
  created_at!: string;

  @ApiProperty({ format: 'date-time', description: '수정 시각' })
  updated_at!: string;
}

export class UserAddressEnvelopeResponseDto {
  @ApiProperty({ type: UserAddressResponseDto })
  address!: UserAddressResponseDto;
}

export class UserAddressesResponseDto {
  @ApiProperty({ type: [UserAddressResponseDto] })
  addresses!: UserAddressResponseDto[];
}

export class CreateUserAddressBodyDto {
  @ApiProperty({ description: '수령인 이름' })
  recipient_name!: string;

  @ApiProperty({ description: '배송 연락처' })
  phone_number!: string;

  @ApiProperty({ description: '우편번호' })
  postal_code!: string;

  @ApiProperty({ description: '기본 주소' })
  address_line1!: string;

  @ApiPropertyOptional({ nullable: true, description: '상세 주소' })
  address_line2?: string | null;

  @ApiPropertyOptional({ default: false, description: '기본 배송지 여부' })
  is_default?: boolean;
}

export class UpdateUserAddressBodyDto {
  @ApiPropertyOptional({ description: '수령인 이름' })
  recipient_name?: string;

  @ApiPropertyOptional({ description: '배송 연락처' })
  phone_number?: string;

  @ApiPropertyOptional({ description: '우편번호' })
  postal_code?: string;

  @ApiPropertyOptional({ description: '기본 주소' })
  address_line1?: string;

  @ApiPropertyOptional({
    nullable: true,
    description: '상세 주소. null이면 삭제',
  })
  address_line2?: string | null;

  @ApiPropertyOptional({ description: '기본 배송지 여부' })
  is_default?: boolean;
}

export class DeleteUserAddressResponseDto {
  @ApiProperty({ example: '배송지를 삭제했습니다.' })
  message!: string;
}

export class OrderItemResponseDto {
  @ApiProperty({ description: '주문 항목 ID' })
  id!: string;

  @ApiProperty({ format: 'uuid', description: '상품 ID' })
  product_id!: string;

  @ApiProperty({ description: '주문 당시 상품명' })
  product_name!: string;

  @ApiProperty({
    type: String,
    example: '12900.00',
    pattern: '^\\d+\\.\\d{2}$',
    description: '주문 당시 단가',
  })
  unit_price!: string;

  @ApiProperty({ description: '주문 수량' })
  quantity!: number;

  @ApiProperty({
    type: String,
    example: '25800.00',
    pattern: '^\\d+\\.\\d{2}$',
    description: '주문 항목 소계',
  })
  subtotal!: string;
}

export class OrderAddressResponseDto {
  @ApiProperty({ format: 'uuid', description: '주문 ID' })
  order_id!: string;

  @ApiProperty({ description: '수령인 이름' })
  recipient_name!: string;

  @ApiProperty({ description: '배송 연락처' })
  phone_number!: string;

  @ApiProperty({ description: '우편번호' })
  postal_code!: string;

  @ApiProperty({ description: '기본 주소' })
  address_line1!: string;

  @ApiPropertyOptional({ nullable: true, description: '상세 주소' })
  address_line2!: string | null;

  @ApiPropertyOptional({ nullable: true, description: '배송 요청사항' })
  delivery_request!: string | null;

  @ApiProperty({ format: 'date-time', description: '스냅샷 생성 시각' })
  created_at!: string;
}

export class OrderItemSummaryResponseDto {
  @ApiProperty({ format: 'uuid', description: '주문 ID' })
  id!: string;

  @ApiProperty({ format: 'uuid', description: '사용자 ID' })
  user_id!: string;

  @ApiProperty({ enum: [...ORDER_STATUSES], description: '주문 상태' })
  status!: OrderStatus;

  @ApiProperty({
    type: String,
    example: '25800.00',
    pattern: '^\\d+\\.\\d{2}$',
    description: '상품 금액 소계',
  })
  subtotal!: string;

  @ApiProperty({
    type: String,
    example: '0.00',
    pattern: '^\\d+\\.\\d{2}$',
    description: '배송비',
  })
  shipping_fee!: string;

  @ApiProperty({
    type: String,
    example: '0.00',
    pattern: '^\\d+\\.\\d{2}$',
    description: '할인 금액',
  })
  discount_amount!: string;

  @ApiProperty({
    type: String,
    example: '25800.00',
    pattern: '^\\d+\\.\\d{2}$',
    description: '주문 총액',
  })
  total_amount!: string;

  @ApiProperty({ format: 'date-time', description: '생성 시각' })
  created_at!: string;

  @ApiProperty({ format: 'date-time', description: '수정 시각' })
  updated_at!: string;
}

export class OrderResponseDto extends OrderItemSummaryResponseDto {
  @ApiProperty({ type: [OrderItemResponseDto] })
  items!: OrderItemResponseDto[];

  @ApiProperty({ type: OrderAddressResponseDto })
  address!: OrderAddressResponseDto;
}

export class OrderEnvelopeResponseDto {
  @ApiProperty({ type: OrderResponseDto })
  order!: OrderResponseDto;
}

export class OrdersResponseDto {
  @ApiProperty({ type: [OrderItemSummaryResponseDto] })
  orders!: OrderItemSummaryResponseDto[];
}

export class CreateOrderBodyDto {
  @ApiProperty({ format: 'uuid', description: '사용할 배송지 ID' })
  address_id!: string;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: 500,
    description: '배송 요청사항',
  })
  delivery_request?: string | null;
}

export class UserEnvelopeResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}

export class CreateUserBodyDto {
  @ApiProperty({ format: 'email', description: '가입 이메일' })
  email!: string;

  @ApiProperty({
    format: 'password',
    minLength: 8,
    description: '8자 이상의 비밀번호',
  })
  password!: string;

  @ApiProperty({ description: '사용자명' })
  name!: string;
}

export class UpdateUserBodyDto {
  @ApiPropertyOptional({ format: 'email', description: '변경할 이메일' })
  email?: string;

  @ApiPropertyOptional({
    format: 'password',
    minLength: 8,
    description: '변경할 비밀번호',
  })
  password?: string;

  @ApiPropertyOptional({ description: '변경할 사용자명' })
  name?: string;
}

export class LoginBodyDto {
  @ApiProperty({ format: 'email', description: '로그인 이메일' })
  email!: string;

  @ApiProperty({ format: 'password', description: '비밀번호' })
  password!: string;
}

export class EmailVerificationBodyDto {
  @ApiProperty({ description: '이메일 인증 링크에 포함된 원본 토큰' })
  token!: string;
}

export class EmailVerificationResendBodyDto {
  @ApiProperty({ format: 'email', description: '인증 메일을 받을 이메일' })
  email!: string;
}

export class EmailVerificationResponseDto {
  @ApiProperty({
    enum: [
      'EMAIL_VERIFIED',
      'EMAIL_ALREADY_VERIFIED',
      'EMAIL_VERIFICATION_SENT',
    ],
  })
  code!: string;

  @ApiProperty()
  message!: string;
}

export class LogoutResponseDto {
  @ApiProperty({ example: '로그아웃되었습니다.' })
  message!: string;
}
