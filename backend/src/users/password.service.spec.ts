import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes a password without storing the original value', async () => {
    const password = 'correct horse battery staple';
    const hash = await service.hash(password);

    expect(hash).not.toContain(password);
    expect(hash.split('$')).toHaveLength(6);
    await expect(service.verify(password, hash)).resolves.toBe(true);
  });

  it('rejects an incorrect password and an empty stored hash', async () => {
    const hash = await service.hash('correct-password');

    await expect(service.verify('wrong-password', hash)).resolves.toBe(false);
    await expect(service.verify('correct-password', null)).resolves.toBe(false);
  });

  it('rejects malformed or tampered password hashes', async () => {
    const hash = await service.hash('correct-password');
    const parts = hash.split('$');
    parts[5] = Buffer.alloc(64, 1).toString('base64');

    await expect(service.verify('correct-password', 'invalid')).resolves.toBe(
      false,
    );
    await expect(
      service.verify('correct-password', parts.join('$')),
    ).resolves.toBe(false);

    await expect(
      service.verify('correct-password', 'scrypt$1$8$1$salt$key'),
    ).resolves.toBe(false);
    await expect(
      service.verify(
        'correct-password',
        `scrypt$16384$8$1${'$'}${Buffer.alloc(16).toString('base64')}${'$'}${Buffer.alloc(32).toString('base64')}`,
      ),
    ).resolves.toBe(false);
  });
});
