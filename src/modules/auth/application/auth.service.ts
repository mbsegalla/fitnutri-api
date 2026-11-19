import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { argon2id, hash, verify } from 'argon2';

import { AccessTokenService } from '../infrastructure/accessToken.service.js';
import { AccountRepository } from '../infrastructure/account.repository.js';

// Verify a hash even when the email is unknown so both login paths do comparable work.
const dummyHash = '$argon2id$v=19$m=19456,t=2,p=1$CyGftMo+EuJHBFu/+7Hc2A$YHub9YF4bknhtH0LoQ8wkRwZ4SqyicZXPNTk9miABgk';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AccountRepository) private readonly accounts: AccountRepository,
    @Inject(AccessTokenService) private readonly tokens: AccessTokenService,
  ) {}

  async register(name: string, email: string, password: string) {
    const passwordHash = await hash(password, { type: argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });

    return this.accounts.create(name, email, passwordHash);
  }

  async login(email: string, password: string) {
    const credentials = await this.accounts.findCredentials(email);
    const matches = await verify(credentials?.passwordHash ?? dummyHash, password);

    if (!credentials || !matches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.tokens.issue(credentials.id);
  }

  async getAccount(accountId: string) {
    const account = await this.accounts.findPublicAccount(accountId);

    if (!account) {
      throw new UnauthorizedException('Account unavailable');
    }

    return account;
  }
}
