import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to the given roles. Combine with RolesGuard.
 * Usage: @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
 */
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);

export const PUBLIC_KEY = 'isPublic';

/** Marks a route as exempt from the global JWT guard. */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(PUBLIC_KEY, true);
