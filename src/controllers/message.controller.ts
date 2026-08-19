import prisma from '../lib/prisma';
import AppError from '../utils/app.error';
import catchAsync from '../utils/catch.async';
import StatusCode from '../utils/status.code';
import { APIFeatures } from '../utils/api.features';
import { ChatType } from '../generated/prisma/enums';
import { SendMessageInput } from '../validation/chat.validation';

const assertChatAccess = async (chatId: string, userId: string): Promise<ChatType> => {
    const chat = await prisma.chat.findUnique({ where: { id: chatId }, select: { type: true } });
    if (!chat) {
        throw new AppError('No chat found with that ID.', StatusCode.NotFound);
    }

    if (chat.type === ChatType.Channel) {
        return chat.type;
    }

    const participant = await prisma.chatParticipant.findUnique({
        where: { chatId_userId: { chatId, userId } },
    });
    if (!participant) {
        throw new AppError('No chat found with that ID.', StatusCode.NotFound);
    }
    return chat.type;
};

export const sendMessage = catchAsync(async (req, res) => {
    const chatId = String(req.params.id);
    const currentUserId = req.user.id;
    const { text } = req.body as SendMessageInput;

    await assertChatAccess(chatId, currentUserId);

    const message = await prisma.$transaction(async tx => {
        const created = await tx.message.create({ data: { chatId, authorId: currentUserId, text } });
        await tx.chat.update({
            where: { id: chatId },
            data: { lastMessageId: created.id },
        });
        return created;
    });

    res.status(StatusCode.Created).json({ status: 'success', data: { message } });
});

export const getMessages = catchAsync(async (req, res) => {
    const chatId = String(req.params.id);
    const currentUserId = req.user.id;

    const chatType = await assertChatAccess(chatId, currentUserId);

    const features = new APIFeatures(
        args => prisma.message.findMany(args),
        req.query as Record<string, string>,
    )
        .where({ chatId })
        .sort('sentAt')
        .paginate();

    const messages = await features.exec();

    if (chatType !== ChatType.Channel) {
        await prisma.chatParticipant.update({
            where: { chatId_userId: { chatId, userId: currentUserId } },
            data: { lastReadAt: new Date() },
        });
    }

    res.status(StatusCode.Ok).json({
        status: 'success',
        results: messages.length,
        data: { messages },
    });
});
