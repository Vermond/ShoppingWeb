import type { DatabaseService } from '../database/database.service';
import {
  AdminShippingPolicyNotFoundError,
  AdminSettingsRepository,
} from './admin-settings.repository';

const activePolicy = {
  id: '1',
  base_fee: '3000.00',
  free_threshold: '50000.00',
  is_active: true,
  created_at: new Date('2026-08-31T00:00:00.000Z'),
  updated_at: new Date('2026-08-31T00:00:00.000Z'),
};

describe('AdminSettingsRepository', () => {
  it('finds the active shipping policy', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [activePolicy] });
    const repository = new AdminSettingsRepository({
      query,
    } as DatabaseService);

    const result = await repository.findActive();

    expect(result).toEqual(activePolicy);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('FROM sales.shipping_policy'),
    );
    expect(query.mock.calls[0]?.[0]).toContain('WHERE is_active = true');
  });

  it('locks and updates the active policy in a transaction', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [activePolicy] })
      .mockResolvedValueOnce({
        rows: [
          {
            ...activePolicy,
            base_fee: '3500.00',
            updated_at: new Date('2026-08-31T02:00:00.000Z'),
          },
        ],
      });
    const databaseService = {
      transaction: jest.fn(
        (callback: (executor: { query: typeof query }) => unknown) =>
          callback({ query }),
      ),
    } as unknown as DatabaseService;
    const repository = new AdminSettingsRepository(databaseService);

    const result = await repository.updateActive({ base_fee: '3500.00' });

    expect(result.base_fee).toBe('3500.00');
    expect(query.mock.calls[0]?.[0]).toContain('FOR UPDATE');
    expect(query.mock.calls[1]?.[1]).toEqual(['1', '3500.00', null]);
    expect(query.mock.calls[1]?.[0]).toContain('updated_at = now()');
  });

  it('rejects an update when there is no active policy', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    const databaseService = {
      transaction: jest.fn(
        (callback: (executor: { query: typeof query }) => unknown) =>
          callback({ query }),
      ),
    } as unknown as DatabaseService;
    const repository = new AdminSettingsRepository(databaseService);

    await expect(
      repository.updateActive({ base_fee: '3500.00' }),
    ).rejects.toBeInstanceOf(AdminShippingPolicyNotFoundError);
  });
});
