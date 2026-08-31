import { BadRequestException } from '@nestjs/common';
import { parseAdminSettingsUpdateInput } from './admin-settings.input';

describe('parseAdminSettingsUpdateInput', () => {
  it('normalizes supported money values to two decimal places', () => {
    expect(
      parseAdminSettingsUpdateInput({
        base_fee: '3000',
        free_threshold: '50000.5',
      }),
    ).toEqual({
      base_fee: '3000.00',
      free_threshold: '50000.50',
    });
  });

  it('supports partial updates', () => {
    expect(parseAdminSettingsUpdateInput({ base_fee: '0.00' })).toEqual({
      base_fee: '0.00',
    });
  });

  it.each([
    {},
    { base_fee: -1 },
    { base_fee: '1.234' },
    { free_threshold: '10000000000.00' },
    { unsupported: '3000.00' },
  ])('rejects invalid settings input: %p', (value) => {
    expect(() => parseAdminSettingsUpdateInput(value)).toThrow(
      BadRequestException,
    );
  });
});
