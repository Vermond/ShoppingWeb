import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
    description:
      '상품 가격. PostgreSQL numeric 타입은 문자열로 반환될 수 있습니다.',
    oneOf: [{ type: 'number' }, { type: 'string' }],
  })
  price!: number | string;

  @ApiProperty({ description: '재고 수량' })
  stock!: number;

  @ApiProperty({ description: '상품 상태' })
  status!: string;

  @ApiProperty({ format: 'date-time', description: '생성 시각' })
  created_at!: string;

  @ApiProperty({ format: 'date-time', description: '수정 시각' })
  updated_at!: string;
}

export class CategoryResponseDto {
  @ApiProperty({
    description: '카테고리 ID',
    oneOf: [{ type: 'string' }, { type: 'integer' }],
  })
  id!: string | number;

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

export class ProductsResponseDto {
  @ApiProperty({ type: [ProductResponseDto] })
  products!: ProductResponseDto[];
}

export class CategoriesResponseDto {
  @ApiProperty({ type: [CategoryResponseDto] })
  categories!: CategoryResponseDto[];
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
