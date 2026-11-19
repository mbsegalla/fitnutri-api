import {
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
  UsePipes,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { z } from 'zod';

import { Authenticated, CurrentAccount } from '../auth/presentation/currentAccount.decorator.js';

import { appointment, appointments, booking, move, room, slotInput, slots, slotView } from './agenda.schemas.js';
import { AgendaService } from './agenda.service.js';

@ApiTags('Agenda')
@ApiBadRequestResponse({ description: 'Invalid input.' })
@ApiNotFoundResponse({ description: 'Resource unavailable.' })
@ApiConflictResponse({ description: 'The operation conflicts with the current state.' })
@UsePipes(new StandardSchemaValidationPipe())
@Controller('')
export class AgendaController {
  constructor(@Inject(AgendaService) private readonly service: AgendaService) {}

  @Post('professionals/me/availability')
  @ApiOperation({ summary: 'Publish an available appointment time' })
  @Authenticated()
  @ApiCreatedResponse({ description: 'Publish an available appointment time.', standardSchema: slotView })
  addSlot(@CurrentAccount() accountId: string, @Body({ schema: slotInput }) input: z.infer<typeof slotInput>) {
    return this.service.addSlot(accountId, input);
  }

  @Get('contracts/:id/availability')
  @ApiOperation({ summary: 'List available future appointments' })
  @Authenticated()
  @ApiOkResponse({ description: 'List available future appointments.', standardSchema: slots })
  availability(@CurrentAccount() accountId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.availability(accountId, id);
  }

  @Post('contracts/:id/appointments')
  @ApiOperation({ summary: 'Book an appointment' })
  @Authenticated()
  @ApiCreatedResponse({ description: 'Book an appointment.', standardSchema: appointment })
  book(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body({ schema: booking }) input: z.infer<typeof booking>,
  ) {
    return this.service.book(accountId, id, input);
  }

  @Get('contracts/:id/appointments')
  @ApiOperation({ summary: 'Read consultation history' })
  @Authenticated()
  @ApiOkResponse({ description: 'Read consultation history.', standardSchema: appointments })
  list(@CurrentAccount() accountId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.list(accountId, id);
  }

  @Put('contracts/:id/appointments/:appointmentId/schedule')
  @ApiOperation({ summary: 'Move an upcoming appointment' })
  @Authenticated()
  @ApiOkResponse({ description: 'Move an upcoming appointment.', standardSchema: appointment })
  reschedule(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('appointmentId', new ParseUUIDPipe()) appointmentId: string,
    @Body({ schema: move }) input: z.infer<typeof move>,
  ) {
    return this.service.reschedule(accountId, id, appointmentId, input);
  }

  @Put('contracts/:id/appointments/:appointmentId/cancellation')
  @ApiOperation({ summary: 'Cancel an upcoming appointment' })
  @Authenticated()
  @ApiOkResponse({ description: 'Cancel an upcoming appointment.', standardSchema: appointment })
  cancel(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('appointmentId', new ParseUUIDPipe()) appointmentId: string,
  ) {
    return this.service.cancel(accountId, id, appointmentId);
  }

  @Header('Cache-Control', 'no-store')
  @ApiServiceUnavailableResponse({ description: 'Video service is not configured.' })
  @Post('contracts/:id/appointments/:appointmentId/room')
  @ApiOperation({ summary: 'Authorize private LiveKit room entry' })
  @Authenticated()
  @ApiCreatedResponse({ description: 'Authorize private LiveKit room entry.', standardSchema: room })
  join(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('appointmentId', new ParseUUIDPipe()) appointmentId: string,
  ) {
    return this.service.join(accountId, id, appointmentId);
  }
}
