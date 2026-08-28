import type { Response } from 'express';
import type { DatabaseService } from '../database/database.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns a live response without checking the database', () => {
    const databaseService = {
      checkConnection: jest.fn(),
    } as unknown as DatabaseService;
    const controller = new HealthController(databaseService);

    expect(controller.live()).toEqual({ status: 'ok' });
    expect(databaseService.checkConnection).not.toHaveBeenCalled();
  });

  it('returns ready when the database is available', async () => {
    const databaseService = {
      checkConnection: jest.fn().mockResolvedValue(undefined),
    } as unknown as DatabaseService;
    const controller = new HealthController(databaseService);

    await expect(controller.ready(mockResponse())).resolves.toEqual({
      status: 'ok',
      database: 'ok',
    });
  });

  it('returns unavailable and sets 503 when the database is unavailable', async () => {
    const databaseService = {
      checkConnection: jest.fn().mockRejectedValue(new Error('database down')),
    } as unknown as DatabaseService;
    const response = mockResponse();
    const controller = new HealthController(databaseService);

    await expect(controller.ready(response)).resolves.toEqual({
      status: 'unavailable',
      database: 'unavailable',
    });
    expect(response.status).toHaveBeenCalledWith(503);
  });
});

function mockResponse(): Response & { status: jest.Mock } {
  return {
    status: jest.fn(),
  } as unknown as Response & { status: jest.Mock };
}
