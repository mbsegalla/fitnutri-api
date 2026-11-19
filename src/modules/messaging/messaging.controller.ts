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
  messageInput,
  messagePage,
  messageView,
  notificationPage,
  notificationView,
  page,
} from './messaging.schemas.js';
import { MessagingService } from './messaging.service.js';

@ApiTags('Messaging')
@ApiBadRequestResponse({ description: 'Invalid input.' })
@ApiNotFoundResponse({ description: 'Resource unavailable.' })
@ApiConflictResponse({ description: 'The operation conflicts with the current state.' })
@UsePipes(new StandardSchemaValidationPipe())
@Controller('')
export class MessagingController {
  constructor(@Inject(MessagingService) private readonly service: MessagingService) {}

  @Post('contracts/:id/messages')
  @ApiOperation({ summary: 'Send a private message' })
  @Authenticated()
  @ApiCreatedResponse({ description: 'Send a private message.', standardSchema: messageView })
  send(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body({ schema: messageInput }) input: z.infer<typeof messageInput>,
  ) {
    return this.service.send(accountId, id, input);
  }

  @Get('contracts/:id/messages')
  @ApiOperation({ summary: 'Read private message history' })
  @Authenticated()
  @ApiOkResponse({ description: 'Read private message history.', standardSchema: messagePage })
  messages(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query({ schema: page }) query: z.infer<typeof page>,
  ) {
    return this.service.messages(accountId, id, query);
  }

  @Put('contracts/:id/messages/:messageId/read')
  @ApiOperation({ summary: 'Mark a received message as read' })
  @Authenticated()
  @ApiOkResponse({ description: 'Mark a received message as read.', standardSchema: messageView })
  read(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
  ) {
    return this.service.read(accountId, id, messageId);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'List your internal notifications' })
  @Authenticated()
  @ApiOkResponse({ description: 'List your internal notifications.', standardSchema: notificationPage })
  notifications(@CurrentAccount() accountId: string, @Query({ schema: page }) query: z.infer<typeof page>) {
    return this.service.notifications(accountId, query);
  }

  @Put('notifications/:notificationId/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @Authenticated()
  @ApiOkResponse({ description: 'Mark a notification as read.', standardSchema: notificationView })
  ack(@CurrentAccount() accountId: string, @Param('notificationId', new ParseUUIDPipe()) notificationId: string) {
    return this.service.ack(accountId, notificationId);
  }
}
