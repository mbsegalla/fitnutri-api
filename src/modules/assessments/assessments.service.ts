import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { z } from 'zod';

import { CoachingService } from '../coaching/coaching.service.js';

import type { analysisSchema, assessmentSchema, intakeSchema } from './assessments.schemas.js';

const metadata = {
  id: true,
  filename: true,
  contentType: true,
  kind: true,
  authorId: true,
  createdAt: true,
  publishedAnalysis: true,
  publishedAt: true,
} as const;

@Injectable()
export class AssessmentsService {
  constructor(@Inject(CoachingService) private readonly coaching: CoachingService) {}

  saveIntake(actor: string, id: string, answers: z.infer<typeof intakeSchema>) {
    return this.coaching.withAccess(actor, id, { role: 'client', active: true }, async (tx, c) => {
      if (
        (c.modality === 'NUTRITION' && answers.trainingExperience) ||
        (c.modality === 'PERSONAL_TRAINING' && answers.dietaryHabits)
      ) {
        throw new BadRequestException('Field is outside the modality');
      }

      return tx.intake.upsert({
        where: { contractId: id },
        create: { contractId: id, answers },
        update: { answers, reviewedAt: null },
      });
    });
  }

  intake(actor: string, id: string) {
    return this.coaching.withAccess(actor, id, {}, async (tx) => {
      const intake = await tx.intake.findUnique({ where: { contractId: id } });

      if (!intake) {
        throw new NotFoundException('Intake not found');
      }

      return intake;
    });
  }

  review(actor: string, id: string) {
    return this.coaching.withAccess(actor, id, { role: 'professional', active: true }, async (tx) => {
      const [row] = await tx.intake.updateManyAndReturn({
        where: { contractId: id },
        data: { reviewedAt: new Date() },
      });

      if (!row) {
        throw new NotFoundException('Intake not found');
      }

      return row;
    });
  }

  assess(actor: string, id: string, input: z.infer<typeof assessmentSchema>) {
    return this.coaching.withAccess(actor, id, { role: 'professional', active: true }, (tx) =>
      tx.assessment.create({ data: { contractId: id, authorId: actor, ...input } }),
    );
  }

  assessments(actor: string, id: string) {
    return this.coaching.withAccess(actor, id, {}, (tx) =>
      tx.assessment.findMany({ where: { contractId: id }, orderBy: [{ assessedAt: 'desc' }, { id: 'asc' }] }),
    );
  }

  upload(actor: string, id: string, kind: string, file: { buffer: Buffer; originalname: string }) {
    const data = file.buffer;
    const pdf = data.subarray(0, 5).toString() === '%PDF-';
    const jpeg = data.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
    const png = data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

    if (!['EXAM', 'PROGRESS_PHOTO'].includes(kind) || !(jpeg || png || (pdf && kind === 'EXAM'))) {
      throw new BadRequestException('Unsupported document kind or file signature');
    }

    return this.coaching.withAccess(actor, id, { role: 'client', active: true }, (tx) =>
      tx.careDocument.create({
        data: {
          authorId: actor,
          contractId: id,
          kind,
          filename: file.originalname.slice(0, 200),
          contentType: pdf ? 'application/pdf' : jpeg ? 'image/jpeg' : 'image/png',
          content: new Uint8Array(data),
        },
        select: metadata,
      }),
    );
  }

  documents(actor: string, id: string) {
    return this.coaching.withAccess(actor, id, {}, (tx, c) =>
      tx.careDocument.findMany({
        where: { contractId: id },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        select: { ...metadata, analysisDraft: c.professionalId === actor },
      }),
    );
  }

  download(actor: string, id: string, documentId: string) {
    return this.coaching.withAccess(actor, id, {}, async (tx) => {
      const file = await tx.careDocument.findFirst({
        where: { id: documentId, contractId: id },
        select: { content: true, contentType: true },
      });

      if (!file) {
        throw new NotFoundException('Document not found');
      }

      return file;
    });
  }

  analyze(actor: string, id: string, documentId: string, input: z.infer<typeof analysisSchema>) {
    return this.coaching.withAccess(actor, id, { role: 'professional', active: true }, async (tx) => {
      const [doc] = await tx.careDocument.updateManyAndReturn({
        where: { id: documentId, contractId: id },
        data: {
          analysisDraft: input.text,
          ...(input.publish ? { publishedAnalysis: input.text, publishedAt: new Date() } : {}),
        },
        select: { ...metadata, analysisDraft: true },
      });

      if (!doc) {
        throw new NotFoundException('Document not found');
      }

      return doc;
    });
  }

  document(actor: string, id: string, documentId: string) {
    return this.coaching.withAccess(actor, id, {}, async (tx, c) => {
      const record = await tx.careDocument.findFirst({
        where: { id: documentId, contractId: id },
        select: { ...metadata, analysisDraft: c.professionalId === actor },
      });

      if (!record) {
        throw new NotFoundException('Record not found');
      }

      return record;
    });
  }

  assessment(actor: string, id: string, assessmentId: string) {
    return this.coaching.withAccess(actor, id, {}, async (tx) => {
      const record = await tx.assessment.findFirst({ where: { id: assessmentId, contractId: id } });

      if (!record) {
        throw new NotFoundException('Record not found');
      }

      return record;
    });
  }
}
