import { Injectable } from '@nestjs/common';
import {
  DatabaseService,
  type DatabaseQueryExecutor,
} from '../database/database.service';
import type { AdminSettingsUpdateInput } from './admin-settings.input';
import type { AdminShippingPolicyRow } from './admin-settings.types';

export class AdminShippingPolicyNotFoundError extends Error {
  constructor() {
    super('활성 배송 정책을 찾을 수 없습니다.');
  }
}

const FIND_ACTIVE_SHIPPING_POLICY_QUERY = `
  SELECT id, base_fee, free_threshold, is_active, created_at, updated_at
  FROM sales.shipping_policy
  WHERE is_active = true
  ORDER BY id DESC
  LIMIT 1
`;

const FIND_ACTIVE_SHIPPING_POLICY_FOR_UPDATE_QUERY = `
  SELECT id, base_fee, free_threshold, is_active, created_at, updated_at
  FROM sales.shipping_policy
  WHERE is_active = true
  ORDER BY id DESC
  LIMIT 1
  FOR UPDATE
`;

const UPDATE_ACTIVE_SHIPPING_POLICY_QUERY = `
  UPDATE sales.shipping_policy
  SET base_fee = COALESCE($2::numeric, base_fee),
      free_threshold = COALESCE($3::numeric, free_threshold),
      updated_at = now()
  WHERE id = $1
    AND is_active = true
  RETURNING id, base_fee, free_threshold, is_active, created_at, updated_at
`;

@Injectable()
export class AdminSettingsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findActive(): Promise<AdminShippingPolicyRow | null> {
    const result = await this.databaseService.query<AdminShippingPolicyRow>(
      FIND_ACTIVE_SHIPPING_POLICY_QUERY,
    );

    return result.rows[0] ?? null;
  }

  async updateActive(
    input: AdminSettingsUpdateInput,
  ): Promise<AdminShippingPolicyRow> {
    return this.databaseService.transaction(async (executor) => {
      const current = await this.findActiveForUpdate(executor);

      if (!current) {
        throw new AdminShippingPolicyNotFoundError();
      }

      const result = await executor.query<AdminShippingPolicyRow>(
        UPDATE_ACTIVE_SHIPPING_POLICY_QUERY,
        [current.id, input.base_fee ?? null, input.free_threshold ?? null],
      );
      const updated = result.rows[0];

      if (!updated) {
        throw new AdminShippingPolicyNotFoundError();
      }

      return updated;
    });
  }

  private async findActiveForUpdate(
    executor: DatabaseQueryExecutor,
  ): Promise<AdminShippingPolicyRow | null> {
    const result = await executor.query<AdminShippingPolicyRow>(
      FIND_ACTIVE_SHIPPING_POLICY_FOR_UPDATE_QUERY,
    );

    return result.rows[0] ?? null;
  }
}
