import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import {
  DatabaseService,
  type DatabaseQueryExecutor,
} from '../database/database.service';
import type { LoginInput } from '../users/users.input';
import { UsersRepository } from '../users/users.repository';
import { UsersService } from '../users/users.service';
import { getAuthConfig } from './auth.config';
import type {
  AccessTokenPayload,
  AuthTokenPair,
  RefreshTokenPayload,
} from './auth.types';
import { RefreshTokenRepository } from './refresh-token.repository';
import type { EnvironmentVariables } from '../config/environment.validation';

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly usersRepository: UsersRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {}

  async login(input: LoginInput): Promise<AuthTokenPair> {
    const user = await this.usersService.login(input);

    return this.issueTokenPair(user);
  }

  async refresh(refreshToken: string): Promise<AuthTokenPair> {
    const config = getAuthConfig(this.configService);
    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        { secret: config.refreshTokenSecret },
      );
    } catch {
      throw new UnauthorizedException('유효하지 않은 Refresh Token입니다.');
    }

    if (payload.type !== 'refresh' || !payload.sub || !payload.jti) {
      throw new UnauthorizedException('유효하지 않은 Refresh Token입니다.');
    }

    const tokenHash = hashToken(refreshToken);

    return this.databaseService.transaction(async (executor) => {
      const storedToken =
        await this.refreshTokenRepository.findByIdAndHashForUpdate(
          payload.jti,
          tokenHash,
          executor,
        );

      if (!storedToken || storedToken.user_id !== payload.sub) {
        throw new UnauthorizedException('유효하지 않은 Refresh Token입니다.');
      }

      if (storedToken.revoked_at) {
        throw new UnauthorizedException('이미 폐기된 Refresh Token입니다.');
      }

      if (new Date(storedToken.expires_at).getTime() <= Date.now()) {
        await this.refreshTokenRepository.revoke(storedToken.id, executor);
        throw new UnauthorizedException('Refresh Token이 만료되었습니다.');
      }

      const user = await this.usersRepository.findById(
        storedToken.user_id,
        executor,
      );

      if (!user || user.status !== 'active' || !user.email_verified) {
        await this.refreshTokenRepository.revokeAllForUser(
          storedToken.user_id,
          executor,
        );
        throw new ForbiddenException('사용할 수 없는 계정입니다.');
      }

      await this.refreshTokenRepository.revoke(storedToken.id, executor);

      return this.issueTokenPair(user, executor);
    });
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const tokenHash = hashToken(refreshToken);

    await this.databaseService.transaction(async (executor) => {
      const storedToken = await this.refreshTokenRepository.findByHashForUpdate(
        tokenHash,
        executor,
      );

      if (storedToken && !storedToken.revoked_at) {
        await this.refreshTokenRepository.revoke(storedToken.id, executor);
      }
    });
  }

  private async issueTokenPair(
    user: AuthTokenPair['user'],
    executor: DatabaseQueryExecutor = this.databaseService,
  ): Promise<AuthTokenPair> {
    const config = getAuthConfig(this.configService);
    const refreshTokenId = randomUUID();
    const accessTokenPayload: AccessTokenPayload = {
      sub: user.id,
      type: 'access',
    };
    const refreshTokenPayload: RefreshTokenPayload = {
      sub: user.id,
      jti: refreshTokenId,
      type: 'refresh',
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessTokenPayload, {
        secret: config.accessTokenSecret,
        expiresIn: config.accessTokenTtlSeconds,
      }),
      this.jwtService.signAsync(refreshTokenPayload, {
        secret: config.refreshTokenSecret,
        expiresIn: config.refreshTokenTtlSeconds,
      }),
    ]);

    await this.refreshTokenRepository.create(
      refreshTokenId,
      user.id,
      hashToken(refreshToken),
      new Date(Date.now() + config.refreshTokenTtlSeconds * 1_000),
      executor,
    );

    return { accessToken, refreshToken, user };
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
