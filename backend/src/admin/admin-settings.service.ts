import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { AdminSettingsUpdateInput } from './admin-settings.input';
import {
  AdminShippingPolicyNotFoundError,
  AdminSettingsRepository,
} from './admin-settings.repository';
import {
  serializeAdminSettings,
  toAdminShippingPolicyRecord,
  type AdminSettingsResponse,
} from './admin-settings.types';

@Injectable()
export class AdminSettingsService {
  private readonly logger = new Logger(AdminSettingsService.name);

  constructor(
    private readonly adminSettingsRepository: AdminSettingsRepository,
  ) {}

  async find(): Promise<AdminSettingsResponse> {
    try {
      const policy = await this.adminSettingsRepository.findActive();

      if (!policy) {
        throw new NotFoundException({
          code: 'SHIPPING_POLICY_NOT_FOUND',
          message: '활성 배송 정책을 찾을 수 없습니다.',
        });
      }

      return serializeAdminSettings(toAdminShippingPolicyRecord(policy));
    } catch (error) {
      throw this.handleError('배송 설정 조회에 실패했습니다.', error);
    }
  }

  async update(
    input: AdminSettingsUpdateInput,
  ): Promise<AdminSettingsResponse> {
    try {
      const policy = await this.adminSettingsRepository.updateActive(input);

      return serializeAdminSettings(toAdminShippingPolicyRecord(policy));
    } catch (error) {
      throw this.handleError('배송 설정 수정에 실패했습니다.', error);
    }
  }

  private handleError(message: string, error: unknown): HttpException {
    if (error instanceof HttpException) {
      return error;
    }

    if (error instanceof AdminShippingPolicyNotFoundError) {
      return new NotFoundException({
        code: 'SHIPPING_POLICY_NOT_FOUND',
        message: error.message,
      });
    }

    this.logger.error(
      message,
      error instanceof Error ? error.stack : String(error),
    );
    return new InternalServerErrorException('배송 설정을 처리하지 못했습니다.');
  }
}
