import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  StandardSchemaValidationPipe,
  UsePipes,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { z } from 'zod';

import { Authenticated, CurrentAccount } from '../auth/presentation/currentAccount.decorator.js';

import { contractSchema, contractsSchema, requestSchema, transitionSchema } from './coaching.schemas.js';
import { CoachingService } from './coaching.service.js';

@ApiTags('Coaching')
@ApiBadRequestResponse({ description: 'Invalid input.' })
@ApiNotFoundResponse({ description: 'Resource unavailable.' })
@ApiConflictResponse({ description: 'The operation conflicts with the current state.' })
@UsePipes(new StandardSchemaValidationPipe())
@Controller('contracts')
export class CoachingController {
  constructor(@Inject(CoachingService) private readonly service: CoachingService) {}

  @Post('')
  @ApiOperation({ summary: 'Request a published offer' })
  @Authenticated()
  @ApiCreatedResponse({ description: 'Request a published offer.', standardSchema: contractSchema })
  request(@CurrentAccount() accountId: string, @Body({ schema: requestSchema }) input: z.infer<typeof requestSchema>) {
    return this.service.request(accountId, input);
  }

  @Get('')
  @ApiOperation({ summary: 'List my contracts as client or professional' })
  @Authenticated()
  @ApiOkResponse({ description: 'List my contracts as client or professional.', standardSchema: contractsSchema })
  list(@CurrentAccount() accountId: string) {
    return this.service.list(accountId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read the terms and status' })
  @Authenticated()
  @ApiOkResponse({ description: 'Read the terms and status.', standardSchema: contractSchema })
  get(@CurrentAccount() accountId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.get(accountId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Accept decline cancel or end a contract' })
  @Authenticated()
  @ApiOkResponse({ description: 'Accept decline cancel or end a contract.', standardSchema: contractSchema })
  transition(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body({ schema: transitionSchema }) input: z.infer<typeof transitionSchema>,
  ) {
    return this.service.transition(accountId, id, input);
  }
}
