import { PrismaMariaDb } from '@prisma/adapter-mariadb';

import { PrismaClient } from '../generated/prisma/client';

const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);

const prisma = new PrismaClient({
    adapter,
    omit: {
        user: {
            email: true,
            password: true,
            passwordChangedAt: true,
            role: true,
            registeredAt: true,
            profileUpdatedAt: true,
        },
        message: { chatId: true },
    },
});

export default prisma;
