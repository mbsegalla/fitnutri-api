import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
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

import {
  dayQuery,
  dayView,
  historyView,
  logInput,
  logsView,
  logView,
  periodQuery,
  planInput,
  versionView,
} from './nutrition.schemas.js';
import { NutritionService } from './nutrition.service.js';

@ApiTags('Nutrition')
@ApiBadRequestResponse({ description: 'Invalid input.' })
@ApiNotFoundResponse({ description: 'Resource unavailable.' })
@ApiConflictResponse({ description: 'The operation conflicts with the current state.' })
@UsePipes(new StandardSchemaValidationPipe())
@Controller('contracts/:id/nutrition')
export class NutritionController {
  constructor(@Inject(NutritionService) private readonly service: NutritionService) {}

  @Post('plans')
  @ApiOperation({ summary: 'Create a meal plan draft' })
  @Authenticated()
  @ApiCreatedResponse({ description: 'Create a meal plan draft.', standardSchema: versionView })
  create(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body({ schema: planInput }) input: z.infer<typeof planInput>,
  ) {
    return this.service.create(accountId, id, input);
  }

  @Put('plans/:planId')
  @ApiOperation({ summary: 'Edit a meal plan draft' })
  @Authenticated()
  @ApiOkResponse({ description: 'Edit a meal plan draft.', standardSchema: versionView })
  update(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('planId', new ParseUUIDPipe()) planId: string,
    @Body({ schema: planInput }) input: z.infer<typeof planInput>,
  ) {
    return this.service.update(accountId, id, planId, input);
  }

  @Post('plans/:planId/copies')
  @ApiOperation({ summary: 'Duplicate an existing plan' })
  @Authenticated()
  @ApiCreatedResponse({ description: 'Duplicate an existing plan.', standardSchema: versionView })
  copy(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('planId', new ParseUUIDPipe()) planId: string,
  ) {
    return this.service.copy(accountId, id, planId);
  }

  @Put('plans/:planId/publication')
  @ApiOperation({ summary: 'Publish an immutable revision' })
  @Authenticated()
  @ApiOkResponse({ description: 'Publish an immutable revision.', standardSchema: versionView })
  publish(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('planId', new ParseUUIDPipe()) planId: string,
  ) {
    return this.service.publish(accountId, id, planId);
  }

  @Get('plans')
  @ApiOperation({ summary: 'Read visible plan versions' })
  @Authenticated()
  @ApiOkResponse({ description: 'Read visible plan versions.', standardSchema: historyView })
  history(@CurrentAccount() accountId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.history(accountId, id);
  }

  @Get('day')
  @ApiOperation({ summary: 'Read daily meals and actual execution' })
  @Authenticated()
  @ApiOkResponse({ description: 'Read daily meals and actual execution.', standardSchema: dayView })
  day(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query({ schema: dayQuery }) query: z.infer<typeof dayQuery>,
  ) {
    return this.service.day(accountId, id, query);
  }

  @Put('plans/:planId/logs')
  @ApiOperation({ summary: 'Record a meal outcome against a version' })
  @Authenticated()
  @ApiOkResponse({ description: 'Record a meal outcome against a version.', standardSchema: logView })
  log(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('planId', new ParseUUIDPipe()) planId: string,
    @Body({ schema: logInput }) input: z.infer<typeof logInput>,
  ) {
    return this.service.log(accountId, id, planId, input);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Read meal records by period' })
  @Authenticated()
  @ApiOkResponse({ description: 'Read meal records by period.', standardSchema: logsView })
  logs(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query({ schema: periodQuery }) query: z.infer<typeof periodQuery>,
  ) {
    return this.service.logs(accountId, id, query);
  }

  @Get('plans/:planId')
  @ApiOperation({ summary: 'Read a specific plan in this relationship' })
  @Authenticated()
  @ApiOkResponse({ standardSchema: versionView })
  plan(
    @CurrentAccount() actor: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('planId', new ParseUUIDPipe()) planId: string,
  ) {
    return this.service.plan(actor, id, planId);
  }
}
