import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  StandardSchemaValidationPipe,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { z } from 'zod';

import { Authenticated, CurrentAccount } from '../auth/presentation/currentAccount.decorator.js';

import {
  analysisSchema,
  assessmentSchema,
  assessmentView,
  assessmentViews,
  documentView,
  documentViews,
  intakeSchema,
  intakeView,
} from './assessments.schemas.js';
import { AssessmentsService } from './assessments.service.js';

@ApiTags('Assessments')
@ApiBadRequestResponse({ description: 'Invalid input.' })
@ApiNotFoundResponse({ description: 'Resource unavailable.' })
@ApiConflictResponse({ description: 'The operation conflicts with the current state.' })
@UsePipes(new StandardSchemaValidationPipe())
@Controller('contracts/:id')
export class AssessmentsController {
  constructor(@Inject(AssessmentsService) private readonly service: AssessmentsService) {}

  @Put('intake')
  @ApiOperation({ summary: 'Submit client intake by modality' })
  @Authenticated()
  @ApiOkResponse({ description: 'Submit client intake by modality.', standardSchema: intakeView })
  saveIntake(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body({ schema: intakeSchema }) input: z.infer<typeof intakeSchema>,
  ) {
    return this.service.saveIntake(accountId, id, input);
  }

  @Get('intake')
  @ApiOperation({ summary: 'Read intake for this relationship' })
  @Authenticated()
  @ApiOkResponse({ description: 'Read intake for this relationship.', standardSchema: intakeView })
  intake(@CurrentAccount() accountId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.intake(accountId, id);
  }

  @Put('intake/review')
  @ApiOperation({ summary: 'Mark the current intake reviewed' })
  @Authenticated()
  @ApiOkResponse({ description: 'Mark the current intake reviewed.', standardSchema: intakeView })
  review(@CurrentAccount() accountId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.review(accountId, id);
  }

  @Post('assessments')
  @ApiOperation({ summary: 'Record measurements' })
  @Authenticated()
  @ApiCreatedResponse({ description: 'Record measurements.', standardSchema: assessmentView })
  assess(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body({ schema: assessmentSchema }) input: z.infer<typeof assessmentSchema>,
  ) {
    return this.service.assess(accountId, id, input);
  }

  @Get('assessments')
  @ApiOperation({ summary: 'List dated assessments' })
  @Authenticated()
  @ApiOkResponse({ description: 'List dated assessments.', standardSchema: assessmentViews })
  assessments(@CurrentAccount() accountId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.assessments(accountId, id);
  }

  @Get('documents')
  @ApiOperation({ summary: 'List documents and visible feedback' })
  @Authenticated()
  @ApiOkResponse({ description: 'List documents and visible feedback.', standardSchema: documentViews })
  documents(@CurrentAccount() accountId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.documents(accountId, id);
  }

  @Put('documents/:documentId/analysis')
  @ApiOperation({ summary: 'Save or publish feedback' })
  @Authenticated()
  @ApiOkResponse({ description: 'Save or publish feedback.', standardSchema: documentView })
  analyze(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
    @Body({ schema: analysisSchema }) input: z.infer<typeof analysisSchema>,
  ) {
    return this.service.analyze(accountId, id, documentId, input);
  }

  @Post('documents')
  @Authenticated()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['kind', 'file'],
      properties: {
        kind: { type: 'string', enum: ['EXAM', 'PROGRESS_PHOTO'] },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Private document metadata', standardSchema: documentView })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 1, parts: 3 } }))
  upload(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('kind') kind: string,
    @UploadedFile() file?: { buffer: Buffer; originalname: string },
  ) {
    if (!file) {
      throw new BadRequestException('File required');
    }

    return this.service.upload(accountId, id, kind, file);
  }

  @Get('documents/:documentId/file')
  @Authenticated()
  @ApiProduces('application/pdf', 'image/jpeg', 'image/png')
  @ApiOkResponse({ description: 'Authorized binary download', schema: { type: 'string', format: 'binary' } })
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async download(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
  ) {
    const file = await this.service.download(accountId, id, documentId);

    return new StreamableFile(Buffer.from(file.content), { type: file.contentType, disposition: 'attachment' });
  }

  @Get('documents/:documentId')
  @ApiOperation({ summary: 'Read a specific document in this relationship' })
  @Authenticated()
  @ApiOkResponse({ standardSchema: documentView })
  document(
    @CurrentAccount() actor: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
  ) {
    return this.service.document(actor, id, documentId);
  }

  @Get('assessments/:assessmentId')
  @ApiOperation({ summary: 'Read a specific assessment in this relationship' })
  @Authenticated()
  @ApiOkResponse({ standardSchema: assessmentView })
  assessment(
    @CurrentAccount() actor: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('assessmentId', new ParseUUIDPipe()) assessmentId: string,
  ) {
    return this.service.assessment(actor, id, assessmentId);
  }
}
