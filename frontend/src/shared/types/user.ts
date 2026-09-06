export type UserRole = 'MEMBER' | 'SITE_ADMIN' | 'RECEPTIONIST';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
