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
  exerciseInput,
  historyView,
  libraryView,
  period,
  planInput,
  sessionsView,
  sessionView,
  setInput,
  startInput,
  versionView,
} from './training.schemas.js';
import { TrainingService } from './training.service.js';

@ApiTags('Training')
@ApiBadRequestResponse({ description: 'Invalid input.' })
@ApiNotFoundResponse({ description: 'Resource unavailable.' })
@ApiConflictResponse({ description: 'The operation conflicts with the current state.' })
@UsePipes(new StandardSchemaValidationPipe())
@Controller('contracts/:id/training')
export class TrainingController {
  constructor(@Inject(TrainingService) private readonly service: TrainingService) {}

  @Post('plans')
  @ApiOperation({ summary: 'Create a training plan' })
  @Authenticated()
  @ApiCreatedResponse({ description: 'Create a training plan.', standardSchema: versionView })
  create(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body({ schema: planInput }) input: z.infer<typeof planInput>,
  ) {
    return this.service.create(accountId, id, input);
  }

  @Put('plans/:planId')
  @ApiOperation({ summary: 'Edit a training draft' })
  @Authenticated()
  @ApiOkResponse({ description: 'Edit a training draft.', standardSchema: versionView })
  update(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('planId', new ParseUUIDPipe()) planId: string,
    @Body({ schema: planInput }) input: z.infer<typeof planInput>,
  ) {
    return this.service.update(accountId, id, planId, input);
  }

  @Post('plans/:planId/copies')
  @ApiOperation({ summary: 'Duplicate a training plan' })
  @Authenticated()
  @ApiCreatedResponse({ description: 'Duplicate a training plan.', standardSchema: versionView })
  copy(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('planId', new ParseUUIDPipe()) planId: string,
  ) {
    return this.service.copy(accountId, id, planId);
  }

  @Put('plans/:planId/publication')
  @ApiOperation({ summary: 'Publish a training revision' })
  @Authenticated()
  @ApiOkResponse({ description: 'Publish a training revision.', standardSchema: versionView })
  publish(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('planId', new ParseUUIDPipe()) planId: string,
  ) {
    return this.service.publish(accountId, id, planId);
  }

  @Get('plans')
  @ApiOperation({ summary: 'Read training versions' })
  @Authenticated()
  @ApiOkResponse({ description: 'Read training versions.', standardSchema: historyView })
  history(@CurrentAccount() accountId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.history(accountId, id);
  }

  @Get('exercises')
  @ApiOperation({ summary: 'Reuse exercises from your training plans' })
  @Authenticated()
  @ApiOkResponse({ description: 'Reuse exercises from your training plans.', standardSchema: libraryView })
  library(@CurrentAccount() accountId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.library(accountId, id);
  }

  @Get('day')
  @ApiOperation({ summary: 'Read scheduled workouts and saved progress' })
  @Authenticated()
  @ApiOkResponse({ description: 'Read scheduled workouts and saved progress.', standardSchema: dayView })
  day(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query({ schema: dayQuery }) query: z.infer<typeof dayQuery>,
  ) {
    return this.service.day(accountId, id, query);
  }

  @Post('plans/:planId/sessions')
  @ApiOperation({ summary: 'Start or resume a session' })
  @Authenticated()
  @ApiCreatedResponse({ description: 'Start or resume a session.', standardSchema: sessionView })
  start(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('planId', new ParseUUIDPipe()) planId: string,
    @Body({ schema: startInput }) input: z.infer<typeof startInput>,
  ) {
    return this.service.start(accountId, id, planId, input);
  }

  @Put('sessions/:sessionId/exercises')
  @ApiOperation({ summary: 'Record a skip or note' })
  @Authenticated()
  @ApiOkResponse({ description: 'Record a skip or note.', standardSchema: sessionView })
  exercise(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Body({ schema: exerciseInput }) input: z.infer<typeof exerciseInput>,
  ) {
    return this.service.exercise(accountId, id, sessionId, input);
  }

  @Put('sessions/:sessionId/sets')
  @ApiOperation({ summary: 'Save actual set execution' })
  @Authenticated()
  @ApiOkResponse({ description: 'Save actual set execution.', standardSchema: sessionView })
  record(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Body({ schema: setInput }) input: z.infer<typeof setInput>,
  ) {
    return this.service.record(accountId, id, sessionId, input);
  }

  @Put('sessions/:sessionId/completion')
  @ApiOperation({ summary: 'Finish a workout' })
  @Authenticated()
  @ApiOkResponse({ description: 'Finish a workout.', standardSchema: sessionView })
  finish(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
  ) {
    return this.service.finish(accountId, id, sessionId);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Compare prescribed exercises with execution by period' })
  @Authenticated()
  @ApiOkResponse({
    description: 'Compare prescribed exercises with execution by period.',
    standardSchema: sessionsView,
  })
  sessions(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query({ schema: period }) query: z.infer<typeof period>,
  ) {
    return this.service.sessions(accountId, id, query);
  }
}
