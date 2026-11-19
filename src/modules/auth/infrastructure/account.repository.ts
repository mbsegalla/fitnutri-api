import { ConflictException, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';

const publicFields = { id: true, name: true, email: true } as const;

@Injectable()
export class AccountRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(name: string, email: string, passwordHash: string) {
    try {
      return await this.prisma.account.create({ data: { name, email, passwordHash }, select: publicFields });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email is already registered');
      }

      // Prisma errors may include the write arguments in their message.
      throw new InternalServerErrorException('Could not create account');
    }
  }

  findCredentials(email: string) {
    return this.prisma.account.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
  }

  findPublicAccount(id: string) {
    return this.prisma.account.findUnique({ where: { id }, select: publicFields });
  }
}
