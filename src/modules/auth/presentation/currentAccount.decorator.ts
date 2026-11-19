import type { ExecutionContext } from '@nestjs/common';
import { applyDecorators, createParamDecorator, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';

import type { AuthenticatedRequest } from './accessToken.guard.js';
import { AccessTokenGuard } from './accessToken.guard.js';

export const CurrentAccount = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => context.switchToHttp().getRequest<AuthenticatedRequest>().accountId,
);

export function Authenticated() {
  return applyDecorators(
    UseGuards(AccessTokenGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'A valid access token is required.' }),
  );
}
