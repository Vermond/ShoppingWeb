import type { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import type { EnvironmentVariables } from '../config/environment.validation';
import { DatabaseService } from './database.service';

jest.mock('pg', () => ({
  Pool: jest.fn(),
}));

describe('DatabaseService', () => {
  const poolConstructor = Pool as unknown as jest.Mock;
  const pool = {
    query: jest.fn(),
    connect: jest.fn(),
    on: jest.fn(),
    end: jest.fn(),
  };
  const configService = {
    getOrThrow: jest.fn().mockReturnValue('postgresql://test/test'),
  } as unknown as ConfigService<EnvironmentVariables>;

  beforeEach(() => {
    jest.clearAllMocks();
    poolConstructor.mockImplementation(() => pool);
  });

  it('lazily creates a pool and forwards parameterized queries', async () => {
    pool.query.mockResolvedValue({ rows: [{ value: 1 }] });
    const service = new DatabaseService(configService);

    await expect(service.query('SELECT $1 AS value', [1])).resolves.toEqual({
      rows: [{ value: 1 }],
    });
    await service.query('SELECT 1');

    expect(poolConstructor).toHaveBeenCalledWith({
      connectionString: 'postgresql://test/test',
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      max: 10,
    });
    expect(pool.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(pool.query).toHaveBeenNthCalledWith(1, 'SELECT $1 AS value', [1]);
    expect(pool.query).toHaveBeenNthCalledWith(2, 'SELECT 1');
  });

  it('commits a successful transaction and releases the client', async () => {
    const client = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    };
    pool.connect.mockResolvedValue(client);
    const service = new DatabaseService(configService);

    await expect(
      service.transaction(async (executor) => {
        await executor.query('UPDATE table_name SET value = $1', ['value']);
        return 'result';
      }),
    ).resolves.toBe('result');

    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenNthCalledWith(
      2,
      'UPDATE table_name SET value = $1',
      ['value'],
    );
    expect(client.query).toHaveBeenNthCalledWith(3, 'COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('rolls back a failed transaction and preserves the original error', async () => {
    const error = new Error('transaction failed');
    const client = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    };
    pool.connect.mockResolvedValue(client);
    const service = new DatabaseService(configService);

    await expect(
      service.transaction(async () => {
        await Promise.resolve();
        throw error;
      }),
    ).rejects.toBe(error);

    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenNthCalledWith(2, 'ROLLBACK');
    expect(client.query).not.toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('checks connectivity and closes the pool on module destroy', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    pool.end.mockResolvedValue(undefined);
    const service = new DatabaseService(configService);

    await service.checkConnection();
    await service.onModuleDestroy();

    expect(pool.query).toHaveBeenCalledWith('SELECT 1');
    expect(pool.end).toHaveBeenCalledTimes(1);
  });
});
