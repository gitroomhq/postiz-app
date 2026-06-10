import { SetMetadata } from '@nestjs/common';
import { VocaccioRole } from '@prisma/client';

export const VOCACCIO_ROLES_KEY = 'vocaccio_roles';

export const VocaccioRoles = (...roles: VocaccioRole[]) =>
  SetMetadata(VOCACCIO_ROLES_KEY, roles);
