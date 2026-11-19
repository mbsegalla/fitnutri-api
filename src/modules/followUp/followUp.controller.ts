import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  StandardSchemaValidationPipe,
  UsePipes,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { z } from 'zod';

import { Authenticated, CurrentAccount } from '../auth/presentation/currentAccount.decorator.js';

import { activities, checkInput, checkView, checkViews, evolution, period, replyInput } from './followUp.schemas.js';
import { FollowUpService } from './followUp.service.js';

@ApiTags('FollowUp')
@ApiBadRequestResponse({ description: 'Invalid input.' })
@ApiNotFoundResponse({ description: 'Resource unavailable.' })
@ApiConflictResponse({ description: 'The operation conflicts with the current state.' })
@UsePipes(new StandardSchemaValidationPipe())
@Controller('')
export class FollowUpController {
  constructor(@Inject(FollowUpService) private readonly service: FollowUpService) {}

  @Put('contracts/:id/check-ins')
  @ApiOperation({ summary: 'Submit the weekly check-in' })
  @Authenticated()
  @ApiOkResponse({ description: 'Submit the weekly check-in.', standardSchema: checkView })
  submit(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body({ schema: checkInput }) input: z.infer<typeof checkInput>,
  ) {
    return this.service.submit(accountId, id, input);
  }

  @Get('contracts/:id/check-ins')
  @ApiOperation({ summary: 'Read check-in history' })
  @Authenticated()
  @ApiOkResponse({ description: 'Read check-in history.', standardSchema: checkViews })
  checks(@CurrentAccount() accountId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.checks(accountId, id);
  }

  @Put('contracts/:id/check-ins/:checkId/reply')
  @ApiOperation({ summary: 'Reply to a client check-in' })
  @Authenticated()
  @ApiOkResponse({ description: 'Reply to a client check-in.', standardSchema: checkView })
  reply(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('checkId', new ParseUUIDPipe()) checkId: string,
    @Body({ schema: replyInput }) input: z.infer<typeof replyInput>,
  ) {
    return this.service.reply(accountId, id, checkId, input);
  }

  @Get('contracts/:id/evolution')
  @ApiOperation({ summary: 'Read recorded outcomes in a date range' })
  @Authenticated()
  @ApiOkResponse({ description: 'Read recorded outcomes in a date range.', standardSchema: evolution })
  progress(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query({ schema: period }) query: z.infer<typeof period>,
  ) {
    return this.service.progress(accountId, id, query);
  }

  @Get('contracts/:id/timeline')
  @ApiOperation({ summary: 'Read relationship timeline' })
  @Authenticated()
  @ApiOkResponse({ description: 'Read relationship timeline.', standardSchema: activities })
  timeline(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query({ schema: period }) query: z.infer<typeof period>,
  ) {
    return this.service.timeline(accountId, id, query);
  }

  @Get('professionals/me/dashboard')
  @ApiOperation({ summary: 'Read actionable work for this professional' })
  @Authenticated()
  @ApiOkResponse({ description: 'Read actionable work for this professional.', standardSchema: activities })
  dashboard(@CurrentAccount() accountId: string) {
    return this.service.dashboard(accountId);
  }
}
