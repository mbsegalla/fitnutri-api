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
  directorySchema,
  draftSchema,
  offerSchema,
  ownerProfileSchema,
  pageSchema,
  publicProfileSchema,
  savedOfferSchema,
} from './profiles.schemas.js';
import { ProfilesService } from './profiles.service.js';

@ApiTags('Profiles')
@ApiBadRequestResponse({ description: 'Invalid input.' })
@ApiNotFoundResponse({ description: 'Resource unavailable.' })
@ApiConflictResponse({ description: 'The operation conflicts with the current state.' })
@UsePipes(new StandardSchemaValidationPipe())
@Controller('professionals')
export class ProfilesController {
  constructor(@Inject(ProfilesService) private readonly service: ProfilesService) {}

  @Put('me')
  @ApiOperation({ summary: 'Save a private profile draft' })
  @Authenticated()
  @ApiOkResponse({ description: 'Save a private profile draft.', standardSchema: ownerProfileSchema })
  save(@CurrentAccount() accountId: string, @Body({ schema: draftSchema }) input: z.infer<typeof draftSchema>) {
    return this.service.save(accountId, input);
  }

  @Get('me')
  @ApiOperation({ summary: 'Preview your profile' })
  @Authenticated()
  @ApiOkResponse({ description: 'Preview your profile.', standardSchema: ownerProfileSchema })
  mine(@CurrentAccount() accountId: string) {
    return this.service.mine(accountId);
  }

  @Put('me/publication')
  @ApiOperation({ summary: 'Publish the saved draft' })
  @Authenticated()
  @ApiOkResponse({ description: 'Publish the saved draft.', standardSchema: ownerProfileSchema })
  publish(@CurrentAccount() accountId: string) {
    return this.service.publish(accountId);
  }

  @Put('me/unpublish')
  @ApiOperation({ summary: 'Hide your public profile' })
  @Authenticated()
  @ApiOkResponse({ description: 'Hide your public profile.', standardSchema: ownerProfileSchema })
  unpublish(@CurrentAccount() accountId: string) {
    return this.service.unpublish(accountId);
  }

  @Post('me/offers')
  @ApiOperation({ summary: 'Create a consulting offer' })
  @Authenticated()
  @ApiCreatedResponse({ description: 'Create a consulting offer.', standardSchema: savedOfferSchema })
  addOffer(@CurrentAccount() accountId: string, @Body({ schema: offerSchema }) input: z.infer<typeof offerSchema>) {
    return this.service.addOffer(accountId, input);
  }

  @Put('me/offers/:id')
  @ApiOperation({ summary: 'Replace your offer terms' })
  @Authenticated()
  @ApiOkResponse({ description: 'Replace your offer terms.', standardSchema: savedOfferSchema })
  editOffer(
    @CurrentAccount() accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body({ schema: offerSchema }) input: z.infer<typeof offerSchema>,
  ) {
    return this.service.editOffer(accountId, id, input);
  }

  @Get('')
  @ApiOperation({ summary: 'Search published professionals' })
  @ApiOkResponse({ description: 'Search published professionals.', standardSchema: directorySchema })
  directory(@Query({ schema: pageSchema }) query: z.infer<typeof pageSchema>) {
    return this.service.directory(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Read a public profile and offers' })
  @ApiOkResponse({ description: 'Read a public profile and offers.', standardSchema: publicProfileSchema })
  detail(@Param('slug') slug: string) {
    return this.service.detail(slug);
  }
}
