import { Test, TestingModule } from '@nestjs/testing';
import type { ExecutionContext, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AccessTokenGuard } from './../src/auth/access-token.guard';
import type { AuthenticatedRequest } from './../src/auth/auth.decorators';
import type { AuthenticatedUser } from './../src/auth/auth.types';
import { UserDetailsService } from './../src/users/user-details.service';
import type {
  UserAddressRecord,
  UserProfileRecord,
} from './../src/users/user-details.types';

const user: AuthenticatedUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'user@example.com',
  name: 'User',
  role: 'customer',
  status: 'active',
  email_verified: true,
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-01T00:00:00.000Z'),
};

const profile: UserProfileRecord = {
  user_id: user.id,
  phone_number: '01012345678',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-02T00:00:00.000Z'),
};

const address: UserAddressRecord = {
  id: '22222222-2222-4222-8222-222222222222',
  user_id: user.id,
  recipient_name: '홍길동',
  phone_number: '01012345678',
  postal_code: '06236',
  address_line1: '서울특별시 강남구 테헤란로 1',
  address_line2: '101호',
  is_default: true,
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-02T00:00:00.000Z'),
};

describe('User profile and address API (e2e)', () => {
  let app: INestApplication<App>;
  let baseUrl: string;
  let service: {
    findProfile: jest.Mock;
    saveProfile: jest.Mock;
    findAddresses: jest.Mock;
    createAddress: jest.Mock;
    updateAddress: jest.Mock;
    deleteAddress: jest.Mock;
  };

  beforeAll(async () => {
    service = {
      findProfile: jest.fn().mockResolvedValue(profile),
      saveProfile: jest.fn().mockResolvedValue(profile),
      findAddresses: jest.fn().mockResolvedValue([address]),
      createAddress: jest.fn().mockResolvedValue(address),
      updateAddress: jest.fn().mockResolvedValue(address),
      deleteAddress: jest.fn().mockResolvedValue(undefined),
    };
    const accessTokenGuard = {
      canActivate: (context: ExecutionContext): boolean => {
        const request = context
          .switchToHttp()
          .getRequest<AuthenticatedRequest>();
        request.user = user;
        return true;
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UserDetailsService)
      .useValue(service)
      .overrideGuard(AccessTokenGuard)
      .useValue(accessTokenGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  it('gets and saves the current user profile', async () => {
    await request(baseUrl)
      .get('/api/users/me/profile')
      .expect(200)
      .expect({
        profile: {
          user_id: user.id,
          phone_number: '01012345678',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-02T00:00:00.000Z',
        },
      });

    await request(baseUrl)
      .put('/api/users/me/profile')
      .send({ phone_number: '010-9876-5432' })
      .expect(200)
      .expect({
        profile: {
          user_id: user.id,
          phone_number: '01012345678',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-02T00:00:00.000Z',
        },
      });

    expect(service.saveProfile).toHaveBeenCalledWith(user.id, {
      phone_number: '01098765432',
    });
  });

  it('manages the current user addresses', async () => {
    await request(baseUrl)
      .get('/api/users/me/addresses')
      .expect(200)
      .expect({
        addresses: [
          {
            id: address.id,
            recipient_name: address.recipient_name,
            phone_number: address.phone_number,
            postal_code: address.postal_code,
            address_line1: address.address_line1,
            address_line2: address.address_line2,
            is_default: true,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-02T00:00:00.000Z',
          },
        ],
      });

    await request(baseUrl)
      .post('/api/users/me/addresses')
      .send({
        recipient_name: '홍길동',
        phone_number: '010-1234-5678',
        postal_code: '06236',
        address_line1: '서울특별시 강남구 테헤란로 1',
        address_line2: '101호',
        is_default: true,
      })
      .expect(201);

    await request(baseUrl)
      .patch(`/api/users/me/addresses/${address.id}`)
      .send({ address_line2: null })
      .expect(200);

    await request(baseUrl)
      .delete(`/api/users/me/addresses/${address.id}`)
      .expect(200)
      .expect({ message: '배송지를 삭제했습니다.' });

    expect(service.findAddresses).toHaveBeenCalledWith(user.id);
    expect(service.createAddress).toHaveBeenCalledWith(user.id, {
      recipient_name: '홍길동',
      phone_number: '01012345678',
      postal_code: '06236',
      address_line1: '서울특별시 강남구 테헤란로 1',
      address_line2: '101호',
      is_default: true,
    });
    expect(service.updateAddress).toHaveBeenCalledWith(user.id, address.id, {
      address_line2: null,
    });
    expect(service.deleteAddress).toHaveBeenCalledWith(user.id, address.id);
  });

  it('rejects unsupported profile fields before calling the service', async () => {
    const callCount = service.saveProfile.mock.calls.length;

    await request(baseUrl)
      .put('/api/users/me/profile')
      .send({ phone_number: '01012345678', email: 'other@example.com' })
      .expect(400)
      .expect({
        code: 'VALIDATION_ERROR',
        message: '지원하지 않는 필드입니다: email',
      });

    expect(service.saveProfile.mock.calls).toHaveLength(callCount);
  });

  afterAll(async () => {
    await app.close();
  });
});
