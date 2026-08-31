import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { AdminSettingsRepository } from './admin-settings.repository';
import { AdminSettingsService } from './admin-settings.service';

const policy = {
  id: '1',
  base_fee: '3000.00',
  free_threshold: '50000.00',
  is_active: true,
  created_at: new Date('2026-08-31T00:00:00.000Z'),
  updated_at: new Date('2026-08-31T00:00:00.000Z'),
};

describe('AdminSettingsService', () => {
  it('returns the active policy for the settings response', async () => {
    const repository = {
      findActive: jest.fn().mockResolvedValue(policy),
      updateActive: jest.fn(),
    } as unknown as AdminSettingsRepository;
    const service = new AdminSettingsService(repository);

    const result = await service.find();

    expect(result.shipping_policy.base_fee).toBe('3000.00');
  });

  it('updates and serializes the active policy', async () => {
    const repository = {
      findActive: jest.fn(),
      updateActive: jest.fn().mockResolvedValue({
        ...policy,
        base_fee: '3500.00',
      }),
    } as unknown as AdminSettingsRepository;
    const service = new AdminSettingsService(repository);

    const result = await service.update({ base_fee: '3500.00' });

    expect(repository.updateActive).toHaveBeenCalledWith({
      base_fee: '3500.00',
    });
    expect(result.shipping_policy.base_fee).toBe('3500.00');
  });

  it('maps missing policies and unexpected failures', async () => {
    const missingRepository = {
      findActive: jest.fn().mockResolvedValue(null),
    } as unknown as AdminSettingsRepository;
    const missingService = new AdminSettingsService(missingRepository);

    await expect(missingService.find()).rejects.toBeInstanceOf(
      NotFoundException,
    );

    const failedRepository = {
      findActive: jest.fn().mockRejectedValue(new Error('database failed')),
    } as unknown as AdminSettingsRepository;
    const failedService = new AdminSettingsService(failedRepository);

    await expect(failedService.find()).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
