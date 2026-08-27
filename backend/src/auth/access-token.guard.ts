import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { getAuthConfig } from './auth.config';
import { readCookie } from './cookie.util';
import type { AccessTokenPayload } from './auth.types';
import type { AuthenticatedRequest } from './auth.decorators';
import { UsersRepository } from '../users/users.repository';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersRepository: UsersRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const config = getAuthConfig();
    const accessToken = readCookie(request, config.accessCookieName);

    if (!accessToken) {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }

    let payload: AccessTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        accessToken,
        { secret: config.accessTokenSecret },
      );
    } catch {
      throw new UnauthorizedException('유효하지 않은 Access Token입니다.');
    }

    if (payload.type !== 'access' || !payload.sub) {
      throw new UnauthorizedException('유효하지 않은 Access Token입니다.');
    }

    const user = await this.usersRepository.findById(payload.sub);

    if (!user || user.status !== 'active' || !user.email_verified) {
      throw new UnauthorizedException('사용할 수 없는 계정입니다.');
    }

    (request as AuthenticatedRequest).user = user;

    return true;
  }
}
