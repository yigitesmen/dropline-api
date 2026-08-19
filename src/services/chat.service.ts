import prisma from '../lib/prisma';
import AppError from '../utils/app.error';
import StatusCode from '../utils/status.code';
import { ChatType, ChatParticipantRole } from '../generated/prisma/enums';
import { Prisma } from '../generated/prisma/client';

export const chatWithParticipantsInclude = {
    participants: {
        include: {
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    username: true,
                    profileImage: true,
                },
            },
        },
    },
} satisfies Prisma.ChatInclude;

export type ChatWithParticipants = Prisma.ChatGetPayload<{
    include: typeof chatWithParticipantsInclude;
}>;

const lastMessageSelect = {
    id: true,
    text: true,
    authorId: true,
    sentAt: true,
} satisfies Prisma.MessageSelect;

export type LastMessage = Prisma.MessageGetPayload<{ select: typeof lastMessageSelect }>;

export const getLastMessagesByIds = async (
    messageIds: Array<string | null>,
): Promise<Map<string, LastMessage>> => {
    const ids = [...new Set(messageIds.filter((id): id is string => id !== null))];
    if (ids.length === 0) return new Map();

    const messages = await prisma.message.findMany({
        where: { id: { in: ids } },
        select: lastMessageSelect,
    });

    return new Map(messages.map(message => [message.id, message]));
};

export const getLastMessage = async (messageId: string | null): Promise<LastMessage | null> => {
    if (!messageId) return null;
    const messages = await getLastMessagesByIds([messageId]);
    return messages.get(messageId) ?? null;
};

export const getUnreadCounts = async (
    chatIds: string[],
    currentUserId: string,
): Promise<Map<string, number>> => {
    if (chatIds.length === 0) return new Map();

    const rows = await prisma.$queryRaw<Array<{ chatId: string; unreadCount: bigint }>>`
        SELECT m.chatId as chatId, COUNT(*) as unreadCount
        FROM messages m
        JOIN chat_participants cp ON cp.chatId = m.chatId AND cp.userId = ${currentUserId}
        WHERE m.chatId IN (${Prisma.join(chatIds)})
          AND m.authorId != ${currentUserId}
          AND (cp.lastReadAt IS NULL OR m.sentAt > cp.lastReadAt)
        GROUP BY m.chatId
    `;

    return new Map(rows.map(row => [row.chatId, Number(row.unreadCount)]));
};

export const getUnreadCount = async (chatId: string, currentUserId: string): Promise<number> => {
    const counts = await getUnreadCounts([chatId], currentUserId);
    return counts.get(chatId) ?? 0;
};

export const findOrCreatePrivateChat = async (
    userAId: string,
    userBId: string,
): Promise<ChatWithParticipants> => {
    const existing = await prisma.chat.findFirst({
        where: {
            type: ChatType.Private,
            AND: [
                { participants: { some: { userId: userAId } } },
                { participants: { some: { userId: userBId } } },
            ],
        },
        include: chatWithParticipantsInclude,
    });

    if (existing) return existing;

    return prisma.chat.create({
        data: {
            type: ChatType.Private,
            participants: {
                create: [{ userId: userAId }, { userId: userBId }],
            },
        },
        include: chatWithParticipantsInclude,
    });
};

export const formatChatSummary = (
    chat: ChatWithParticipants,
    currentUserId: string,
    lastMessage: LastMessage | null,
    unreadCount: number,
) => {
    const isChannel = chat.type === ChatType.Channel;
    const me = chat.participants.find(p => p.userId === currentUserId);
    if (!isChannel && !me) {
        throw new Error(
            'formatChatSummary called with a user who is not a participant of the chat.',
        );
    }

    const others = chat.participants.filter(p => p.userId !== currentUserId);
    const isPrivate = chat.type === ChatType.Private;
    const otherUser = isPrivate ? others[0]?.user : null;

    const title = isPrivate
        ? `${otherUser?.firstName ?? ''} ${otherUser?.lastName ?? ''}`.trim()
        : chat.title;
    const image = isPrivate ? (otherUser?.profileImage ?? null) : chat.image;

    return {
        id: chat.id,
        type: chat.type,
        title,
        image,
        myRole: me?.role ?? null,
        participants: isChannel
            ? []
            : others.map(p => ({
                  id: p.user.id,
                  firstName: p.user.firstName,
                  lastName: p.user.lastName,
                  username: p.user.username,
                  profileImage: p.user.profileImage,
                  role: p.role,
              })),
        lastMessage,
        unreadCount,
        lastActivityAt: chat.lastActivityAt,
    };
};

export const isChatAdmin = (
    participant: { role: ChatParticipantRole } | undefined,
): boolean => participant?.role === ChatParticipantRole.Admin;

export const formatSingleChat = async (
    chat: ChatWithParticipants,
    currentUserId: string,
) => {
    const [lastMessage, unreadCount] = await Promise.all([
        getLastMessage(chat.lastMessageId),
        getUnreadCount(chat.id, currentUserId),
    ]);

    return formatChatSummary(chat, currentUserId, lastMessage, unreadCount);
};

const chatWithRawParticipantsInclude = { participants: true } satisfies Prisma.ChatInclude;

type ChatWithRawParticipants = Prisma.ChatGetPayload<{
    include: typeof chatWithRawParticipantsInclude;
}>;

export const getManageableChatParticipant = async (
    chatId: string,
    currentUserId: string,
    wrongTypeMessage: string,
): Promise<{ chat: ChatWithRawParticipants; me: ChatWithRawParticipants['participants'][number] }> => {
    const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: chatWithRawParticipantsInclude,
    });
    if (!chat) {
        throw new AppError('No chat found with that ID.', StatusCode.NotFound);
    }
    if (chat.type === ChatType.Private || chat.type === ChatType.Channel) {
        throw new AppError(wrongTypeMessage, StatusCode.BadRequest);
    }

    const me = chat.participants.find(p => p.userId === currentUserId);
    if (!me) {
        throw new AppError('No chat found with that ID.', StatusCode.NotFound);
    }

    return { chat, me };
};
