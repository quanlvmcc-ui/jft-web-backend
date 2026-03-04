import { UserRole } from '@prisma/client';

export class UserProfileDto {
  id: string;
  email: string;
  role: UserRole;
  displayName: string | null;
  phoneNumber: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}
