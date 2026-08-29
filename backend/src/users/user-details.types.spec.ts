import {
  serializeUserAddress,
  serializeUserProfile,
  type UserAddressRecord,
  type UserProfileRecord,
} from './user-details.types';

describe('user details serializers', () => {
  it('serializes a profile without exposing database date objects', () => {
    const profile: UserProfileRecord = {
      user_id: '11111111-1111-4111-8111-111111111111',
      phone_number: '01012345678',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-02T00:00:00.000Z'),
    };

    expect(serializeUserProfile(profile)).toEqual({
      user_id: profile.user_id,
      phone_number: profile.phone_number,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
    });
  });

  it('does not expose the internal user id in an address response', () => {
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

    expect(serializeUserAddress(address)).toEqual({
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
  });
});
