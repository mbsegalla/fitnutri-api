import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

import { AccessTokenService } from '../infrastructure/accessToken.service.js';

export interface AuthenticatedRequest extends Request {
  accountId: string;
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(@Inject(AccessTokenService) private readonly tokens: AccessTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const match = /^Bearer ([^\s]+)$/i.exec(request.headers.authorization ?? '');

    if (!match) {
      throw new UnauthorizedException('Bearer access token required');
    }

    request.accountId = await this.tokens.verify(match[1]);

    return true;
  }
}
