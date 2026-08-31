import Decimal from 'decimal.js';

export type AdminShippingPolicyRow = {
  id: string;
  base_fee: string;
  free_threshold: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

export type AdminShippingPolicyRecord = Omit<
  AdminShippingPolicyRow,
  'base_fee' | 'free_threshold'
> & {
  base_fee: Decimal;
  free_threshold: Decimal;
};

export type AdminSettingsResponse = {
  shipping_policy: {
    id: string;
    base_fee: string;
    free_threshold: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
};

export function toAdminShippingPolicyRecord(
  row: AdminShippingPolicyRow,
): AdminShippingPolicyRecord {
  return {
    ...row,
    base_fee: new Decimal(row.base_fee),
    free_threshold: new Decimal(row.free_threshold),
  };
}

export function serializeAdminSettings(
  policy: AdminShippingPolicyRecord,
): AdminSettingsResponse {
  return {
    shipping_policy: {
      id: policy.id,
      base_fee: policy.base_fee.toFixed(2),
      free_threshold: policy.free_threshold.toFixed(2),
      is_active: policy.is_active,
      created_at: policy.created_at.toISOString(),
      updated_at: policy.updated_at.toISOString(),
    },
  };
}
