import type { UserRecord } from '../users/users.types';

export type AccessTokenPayload = {
  sub: string;
  type: 'access';
};

export type RefreshTokenPayload = {
  sub: string;
  jti: string;
  type: 'refresh';
};

export type AuthenticatedUser = UserRecord;

export type AuthTokenPair = {
  accessToken: string;
  refreshToken: string;
  user: UserRecord;
};
