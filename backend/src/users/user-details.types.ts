export type UserAddressRecord = {
  id: string;
  user_id: string;
  recipient_name: string;
  phone_number: string;
  postal_code: string;
  address_line1: string;
  address_line2: string | null;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
};

export type UserAddressResponse = Omit<
  UserAddressRecord,
  'user_id' | 'created_at' | 'updated_at'
> & {
  created_at: string;
  updated_at: string;
};

export function serializeUserAddress(
  address: UserAddressRecord,
): UserAddressResponse {
  return {
    id: address.id,
    recipient_name: address.recipient_name,
    phone_number: address.phone_number,
    postal_code: address.postal_code,
    address_line1: address.address_line1,
    address_line2: address.address_line2,
    is_default: address.is_default,
    created_at: address.created_at.toISOString(),
    updated_at: address.updated_at.toISOString(),
  };
}
