import { z } from 'zod';

import { ChatType } from '../generated/prisma/enums';

const chatTitle = z
    .string()
    .trim()
    .min(1, 'Title is required.')
    .max(50, 'Title cannot exceed 50 characters in length.');

const participantId = z.string().min(1, 'Invalid participant ID.');

export const createChatSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal(ChatType.Private),
        userId: participantId,
    }),
    z.object({
        type: z.literal(ChatType.Group),
        title: chatTitle,
        participantIds: z
            .array(participantId)
            .min(1, 'A group chat requires at least one other participant.'),
    }),
    z.object({
        type: z.literal(ChatType.Channel),
        title: chatTitle,
    }),
]);

export const updateChatSchema = z
    .object({
        title: chatTitle.optional(),
    })
    .strict();

export const addParticipantSchema = z.object({
    userId: participantId,
});

export const sendMessageSchema = z.object({
    text: z
        .string()
        .trim()
        .min(1, 'Message cannot be empty.')
        .max(4000, 'Message cannot exceed 4000 characters in length.'),
});

export type CreateChatInput = z.infer<typeof createChatSchema>;
export type UpdateChatInput = z.infer<typeof updateChatSchema>;
export type AddParticipantInput = z.infer<typeof addParticipantSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
