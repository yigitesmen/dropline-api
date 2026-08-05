import { hash, compare } from 'bcryptjs';

export const PASSWORD_SALT_ROUNDS = 12;

export const publicUserSelect = {
    id: true,
    firstName: true,
    lastName: true,
    username: true,
    status: true,
    profileImageUrl: true,
    email: true,
    role: true,
    createdAt: true,
    updatedAt: true,
} as const;

export const hashPassword = (password: string): Promise<string> =>
    hash(password, PASSWORD_SALT_ROUNDS);

export const correctPassword = (
    candidatePassword: string,
    hashedPassword: string,
): Promise<boolean> => compare(candidatePassword, hashedPassword);

export const hasPasswordChangedAfterJWT = (
    passwordChangedAt: Date | null,
    JWTTimestamp: number,
): boolean => {
    if (!passwordChangedAt) return false;
    const changedTimestamp = Math.floor(passwordChangedAt.getTime() / 1000);
    return JWTTimestamp < changedTimestamp;
};
