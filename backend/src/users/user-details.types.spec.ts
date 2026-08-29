import {
  serializeUserAddress,
  type UserAddressRecord,
} from './user-details.types';

describe('user address serializers', () => {
  it('serializes address timestamps and excludes the internal user id', () => {
    const address: UserAddressRecord = {
      id: '22222222-2222-4222-8222-222222222222',
      user_id: '11111111-1111-4111-8111-111111111111',
      recipient_name: '홍길동',
      phone_number: '01012345678',
      postal_code: '06236',
      address_line1: '서울특별시 강남구 테헤란로 1',
      address_line2: '101호',
      is_default: true,
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-02T00:00:00.000Z'),
    };

    const response = serializeUserAddress(address);

    expect(response).toEqual({
      id: address.id,
      recipient_name: address.recipient_name,
      phone_number: address.phone_number,
      postal_code: address.postal_code,
      address_line1: address.address_line1,
      address_line2: address.address_line2,
      is_default: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
    });
    expect(response).not.toHaveProperty('user_id');
  });
});
