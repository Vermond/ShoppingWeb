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

    const result = await this.databaseService.transaction<RefreshOutcome>(
      async (executor) => {
        const storedToken =
          await this.refreshTokenRepository.findByIdAndHashForUpdate(
            payload.jti,
            tokenHash,
            executor,
          );

        if (!storedToken || storedToken.user_id !== payload.sub) {
          return { type: 'invalid' };
        }

        if (storedToken.revoked_at) {
          await this.refreshTokenRepository.revokeAllForSession(
            storedToken.session_id,
            executor,
          );
          return { type: 'revoked' };
        }

        if (new Date(storedToken.expires_at).getTime() <= Date.now()) {
          await this.refreshTokenRepository.revoke(storedToken.id, executor);
          return { type: 'expired' };
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
          return { type: 'unavailable_user' };
        }

        await this.refreshTokenRepository.revoke(storedToken.id, executor);

        return {
          type: 'success',
          tokenPair: await this.issueTokenPair(
            user,
            executor,
            storedToken.session_id,
          ),
        };
      },
    );

    if (result.type === 'success') {
      return result.tokenPair;
    }

    if (result.type === 'expired') {
      throw new UnauthorizedException('Refresh Token이 만료되었습니다.');
    }

    if (result.type === 'unavailable_user') {
      throw new ForbiddenException('사용할 수 없는 계정입니다.');
    }

    if (result.type === 'revoked') {
      throw new UnauthorizedException('이미 폐기된 Refresh Token입니다.');
    }

    throw new UnauthorizedException('유효하지 않은 Refresh Token입니다.');
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
        await this.refreshTokenRepository.revokeAllForSession(
          storedToken.session_id,
          executor,
        );
      }
    });
  }

  private async issueTokenPair(
    user: AuthTokenPair['user'],
    executor: DatabaseQueryExecutor = this.databaseService,
    sessionId: string = randomUUID(),
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
      sessionId,
      hashToken(refreshToken),
      new Date(Date.now() + config.refreshTokenTtlSeconds * 1_000),
      executor,
    );

    return { accessToken, refreshToken, user };
  }
}

type RefreshOutcome =
  | { type: 'success'; tokenPair: AuthTokenPair }
  | { type: 'invalid' | 'revoked' | 'expired' | 'unavailable_user' };

function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
