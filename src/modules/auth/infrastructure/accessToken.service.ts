import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jwtVerify, SignJWT } from 'jose';
import { z } from 'zod';

import type { Environment } from '../../../config/environment.js';

const issuer = 'fitnutri-api';
const audience = 'fitnutri-api';
const algorithm = 'HS256';

@Injectable()
export class AccessTokenService {
  private readonly key: Uint8Array;
  private readonly ttl: number;

  constructor(@Inject(ConfigService) config: ConfigService<Environment, true>) {
    this.key = Buffer.from(config.get('AUTH_JWT_SECRET', { infer: true }), 'hex');
    this.ttl = config.get('AUTH_ACCESS_TOKEN_TTL_SECONDS', { infer: true });
  }

  async issue(accountId: string) {
    const accessToken = await new SignJWT()
      .setProtectedHeader({ alg: algorithm, typ: 'JWT' })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject(accountId)
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + this.ttl)
      .sign(this.key);

    return { accessToken, tokenType: 'Bearer' as const, expiresIn: this.ttl };
  }

  async verify(token: string): Promise<string> {
    try {
      const { payload } = await jwtVerify(token, this.key, {
        issuer,
        audience,
        algorithms: [algorithm],
        requiredClaims: ['sub', 'exp', 'iat'],
      });

      return z.uuid().parse(payload.sub);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
