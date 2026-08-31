import Decimal from 'decimal.js';
import {
  serializeAdminSettings,
  toAdminShippingPolicyRecord,
  type AdminShippingPolicyRow,
} from './admin-settings.types';

describe('admin-settings.types', () => {
  it('converts database numeric values to Decimal and serializes money', () => {
    const policy: AdminShippingPolicyRow = {
      id: '1',
      base_fee: '3000',
      free_threshold: '50000.5',
      is_active: true,
      created_at: new Date('2026-08-31T00:00:00.000Z'),
      updated_at: new Date('2026-08-31T01:00:00.000Z'),
    };

    const record = toAdminShippingPolicyRecord(policy);
    const response = serializeAdminSettings(record);

    expect(record.base_fee).toBeInstanceOf(Decimal);
    expect(response).toEqual({
      shipping_policy: {
        id: '1',
        base_fee: '3000.00',
        free_threshold: '50000.50',
        is_active: true,
        created_at: '2026-08-31T00:00:00.000Z',
        updated_at: '2026-08-31T01:00:00.000Z',
      },
    });
  });
});
