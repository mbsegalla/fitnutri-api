import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Inject,
  Post,
  Req,
  StandardSchemaValidationPipe,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { z } from 'zod';

import { AuthService } from '../application/auth.service.js';

import type { AuthenticatedRequest } from './accessToken.guard.js';
import { AccessTokenGuard } from './accessToken.guard.js';
import { loginSchema, publicAccountSchema, registerSchema, tokenSchema } from './auth.schemas.js';

@ApiTags('Auth')
@Controller('auth')
@UsePipes(new StandardSchemaValidationPipe({ exceptionFactory: () => new BadRequestException('Invalid request body') }))
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post('register')
  @ApiCreatedResponse({ description: 'Account created.', standardSchema: publicAccountSchema })
  @ApiConflictResponse({ description: 'Email already registered.' })
  @ApiBadRequestResponse({ description: 'Invalid name, email or password.' })
  register(@Body({ schema: registerSchema }) input: z.infer<typeof registerSchema>) {
    return this.auth.register(input.name, input.email, input.password);
  }

  @Post('login')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ description: 'Access token with its lifetime in seconds.', standardSchema: tokenSchema })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  @ApiBadRequestResponse({ description: 'Invalid email or password format.' })
  login(@Body({ schema: loginSchema }) input: z.infer<typeof loginSchema>) {
    return this.auth.login(input.email, input.password);
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ description: 'Authenticated account.', standardSchema: publicAccountSchema })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid or expired access token.' })
  me(@Req() request: AuthenticatedRequest) {
    return this.auth.getAccount(request.accountId);
  }
}
