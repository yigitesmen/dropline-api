import { User as PrismaUser } from '../../generated/prisma/client';

declare global {
    namespace Express {
        interface Request {
            user: PrismaUser;
        }
    }
}

export {};
