export type UserRecord = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
};

export type StoredUserRecord = UserRecord & {
  password_hash: string | null;
};

export type UserResponse = Omit<UserRecord, 'created_at' | 'updated_at'> & {
  created_at: string;
  updated_at: string;
};

export function serializeUser(user: UserRecord): UserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    email_verified: user.email_verified,
    created_at: user.created_at.toISOString(),
    updated_at: user.updated_at.toISOString(),
  };
}
