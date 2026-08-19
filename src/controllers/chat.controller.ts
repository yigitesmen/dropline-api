import prisma from '../lib/prisma';
import { deleteChatImageByFilename } from '../middleware/upload';
import AppError from '../utils/app.error';
import catchAsync from '../utils/catch.async';
import StatusCode from '../utils/status.code';
import { ChatType, ChatParticipantRole, UserRole } from '../generated/prisma/enums';
import {
    chatWithParticipantsInclude,
    findOrCreatePrivateChat,
    formatChatSummary,
    formatSingleChat,
    getManageableChatParticipant,
    getLastMessagesByIds,
    getUnreadCounts,
    isChatAdmin,
} from '../services/chat.service';
import {
    AddParticipantInput,
    CreateChatInput,
    UpdateChatInput,
} from '../validation/chat.validation';

export const createChat = catchAsync(async (req, res) => {
    const input = req.body as CreateChatInput;
    const currentUserId = req.user.id;

    if (input.type === ChatType.Private) {
        if (input.userId === currentUserId) {
            throw new AppError('You cannot start a chat with yourself.', StatusCode.BadRequest);
        }

        const otherUser = await prisma.user.findUnique({ where: { id: input.userId } });
        if (!otherUser) {
            throw new AppError('No user found with that ID.', StatusCode.NotFound);
        }

        const chat = await findOrCreatePrivateChat(currentUserId, input.userId);
        const formatted = await formatSingleChat(chat, currentUserId);
        res.status(StatusCode.Created).json({ status: 'success', data: { chat: formatted } });
        return;
    }

    if (input.type === ChatType.Channel) {
        if (req.user.role !== UserRole.Admin) {
            throw new AppError('Only admins can create channels.', StatusCode.Forbidden);
        }

        const chat = await prisma.chat.create({
            data: { type: input.type, title: input.title },
            include: chatWithParticipantsInclude,
        });

        const formatted = await formatSingleChat(chat, currentUserId);
        res.status(StatusCode.Created).json({ status: 'success', data: { chat: formatted } });
        return;
    }

    const participantIds = Array.from(
        new Set([...input.participantIds, currentUserId]),
    );

    const existingUserCount = await prisma.user.count({
        where: { id: { in: participantIds } },
    });
    if (existingUserCount !== participantIds.length) {
        throw new AppError('One or more participant IDs are invalid.', StatusCode.BadRequest);
    }

    const chat = await prisma.chat.create({
        data: {
            type: input.type,
            title: input.title,
            participants: {
                create: participantIds.map(userId => ({
                    userId,
                    role:
                        userId === currentUserId
                            ? ChatParticipantRole.Admin
                            : ChatParticipantRole.Member,
                })),
            },
        },
        include: chatWithParticipantsInclude,
    });

    const formatted = await formatSingleChat(chat, currentUserId);
    res.status(StatusCode.Created).json({ status: 'success', data: { chat: formatted } });
});

export const getMyChats = catchAsync(async (req, res) => {
    const currentUserId = req.user.id;

    const chats = await prisma.chat.findMany({
        where: { participants: { some: { userId: currentUserId } } },
        include: chatWithParticipantsInclude,
        orderBy: { lastActivityAt: 'desc' },
    });

    const [lastMessages, unreadCounts] = await Promise.all([
        getLastMessagesByIds(chats.map(chat => chat.lastMessageId)),
        getUnreadCounts(chats.map(chat => chat.id), currentUserId),
    ]);

    const formatted = chats.map(chat =>
        formatChatSummary(
            chat,
            currentUserId,
            chat.lastMessageId ? (lastMessages.get(chat.lastMessageId) ?? null) : null,
            unreadCounts.get(chat.id) ?? 0,
        ),
    );

    res.status(StatusCode.Ok).json({
        status: 'success',
        results: formatted.length,
        data: { chats: formatted },
    });
});

export const getChannels = catchAsync(async (req, res) => {
    const currentUserId = req.user.id;

    const channels = await prisma.chat.findMany({
        where: { type: ChatType.Channel },
        include: chatWithParticipantsInclude,
        orderBy: { lastActivityAt: 'desc' },
    });

    const lastMessages = await getLastMessagesByIds(channels.map(chat => chat.lastMessageId));

    const formatted = channels.map(chat =>
        formatChatSummary(
            chat,
            currentUserId,
            chat.lastMessageId ? (lastMessages.get(chat.lastMessageId) ?? null) : null,
            0,
        ),
    );

    res.status(StatusCode.Ok).json({
        status: 'success',
        results: formatted.length,
        data: { chats: formatted },
    });
});

export const getChat = catchAsync(async (req, res) => {
    const currentUserId = req.user.id;

    const chat = await prisma.chat.findUnique({
        where: { id: String(req.params.id) },
        include: chatWithParticipantsInclude,
    });

    const isMember = chat?.type === ChatType.Channel || chat?.participants.some(p => p.userId === currentUserId);
    if (!chat || !isMember) {
        throw new AppError('No chat found with that ID.', StatusCode.NotFound);
    }

    const formatted = await formatSingleChat(chat, currentUserId);
    res.status(StatusCode.Ok).json({ status: 'success', data: { chat: formatted } });
});

export const updateChat = catchAsync(async (req, res) => {
    const currentUserId = req.user.id;
    const chatId = String(req.params.id);

    const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: chatWithParticipantsInclude,
    });
    if (!chat) {
        throw new AppError('No chat found with that ID.', StatusCode.NotFound);
    }
    if (chat.type === ChatType.Private) {
        throw new AppError('Private chats cannot be updated.', StatusCode.BadRequest);
    }

    if (chat.type === ChatType.Channel) {
        if (req.user.role !== UserRole.Admin) {
            throw new AppError('Only admins can update this channel.', StatusCode.Forbidden);
        }
    } else {
        const me = chat.participants.find(p => p.userId === currentUserId);
        if (!isChatAdmin(me)) {
            throw new AppError('Only chat admins can update this chat.', StatusCode.Forbidden);
        }
    }

    const uploadedFilename = req.file?.filename;

    const updatedChat = await prisma.chat.update({
        where: { id: chatId },
        data: {
            ...(req.body as UpdateChatInput),
            ...(uploadedFilename && { image: uploadedFilename }),
        },
        include: chatWithParticipantsInclude,
    });

    if (uploadedFilename && chat.image) {
        await deleteChatImageByFilename(chat.image);
    }

    const formatted = await formatSingleChat(updatedChat, currentUserId);
    res.status(StatusCode.Ok).json({ status: 'success', data: { chat: formatted } });
});

export const markChatAsRead = catchAsync(async (req, res) => {
    const currentUserId = req.user.id;
    const chatId = String(req.params.id);

    const result = await prisma.chatParticipant.updateMany({
        where: { chatId, userId: currentUserId },
        data: { lastReadAt: new Date() },
    });

    if (result.count === 0) {
        throw new AppError('No chat found with that ID.', StatusCode.NotFound);
    }

    res.status(StatusCode.NoContent).json();
});

export const addParticipant = catchAsync(async (req, res) => {
    const currentUserId = req.user.id;
    const chatId = String(req.params.id);
    const { userId } = req.body as AddParticipantInput;

    const { chat, me } = await getManageableChatParticipant(
        chatId,
        currentUserId,
        'This chat type does not support a participant list.',
    );
    if (!isChatAdmin(me)) {
        throw new AppError('Only chat admins can add participants.', StatusCode.Forbidden);
    }

    if (chat.participants.some(p => p.userId === userId)) {
        throw new AppError('This user is already a participant.', StatusCode.Conflict);
    }

    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
        throw new AppError('No user found with that ID.', StatusCode.NotFound);
    }

    await prisma.chatParticipant.create({ data: { chatId, userId } });

    const updatedChat = await prisma.chat.findUniqueOrThrow({
        where: { id: chatId },
        include: chatWithParticipantsInclude,
    });
    const formatted = await formatSingleChat(updatedChat, currentUserId);

    res.status(StatusCode.Created).json({ status: 'success', data: { chat: formatted } });
});

export const removeParticipant = catchAsync(async (req, res) => {
    const currentUserId = req.user.id;
    const chatId = String(req.params.id);
    const targetUserId = String(req.params.userId);

    const { chat, me } = await getManageableChatParticipant(
        chatId,
        currentUserId,
        'This chat type does not support a participant list.',
    );

    const isSelf = targetUserId === currentUserId;
    if (!isSelf && !isChatAdmin(me)) {
        throw new AppError('Only chat admins can remove other participants.', StatusCode.Forbidden);
    }

    const target = chat.participants.find(p => p.userId === targetUserId);
    if (!target) {
        throw new AppError('This user is not a participant of this chat.', StatusCode.NotFound);
    }

    const remainingParticipants = chat.participants.filter(p => p.userId !== targetUserId);
    const isLastAdmin =
        isChatAdmin(target) && !remainingParticipants.some(p => isChatAdmin(p));
    const successor = isLastAdmin
        ? remainingParticipants.sort(
              (a, b) => a.joinedAt.getTime() - b.joinedAt.getTime(),
          )[0]
        : undefined;

    await prisma.$transaction(async tx => {
        await tx.chatParticipant.delete({
            where: { chatId_userId: { chatId, userId: targetUserId } },
        });

        if (successor) {
            await tx.chatParticipant.update({
                where: { chatId_userId: { chatId, userId: successor.userId } },
                data: { role: ChatParticipantRole.Admin },
            });
        }
    });

    res.status(StatusCode.NoContent).json();
});
