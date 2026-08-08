import { Request, Response, NextFunction } from 'express';
import { sign, verify, JwtPayload, SignOptions } from 'jsonwebtoken';

import prisma from '../lib/prisma';
import { UserRole } from '../generated/prisma/enums';
import { withResolvedProfileImage } from '../middleware/upload';
import AppError from '../utils/app.error';
import catchAsync from '../utils/catch.async';
import StatusCode from '../utils/status.code';
import {
    correctPassword,
    hashPassword,
    hasPasswordChangedAfterJWT,
    publicUserOmit,
} from '../services/user.service';
import {
    LoginInput,
    SignupInput,
    UpdateMyPasswordInput,
} from '../validation/user.validation';

interface JWT {
    id: string;
    iat: number;
}

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN as SignOptions['expiresIn'];

const signJWT = (id: string): string =>
    sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const verifyJWT = (token: string): Promise<JWT> =>
    new Promise((resolve, reject) => {
        verify(token, JWT_SECRET, (error, decoded) => {
            if (error || !decoded) return reject(error);
            resolve(decoded as JwtPayload & JWT);
        });
    });

const sendAuthResponse = (
    userId: string,
    user: unknown,
    statusCode: StatusCode,
    res: Response,
) => {
    const jwt = signJWT(userId);

    res.status(statusCode).json({
        status: 'success',
        jwt,
        data: { user },
    });
};

export const signup = catchAsync(async (req, res) => {
    const { firstName, lastName, username, email, password, status } =
        req.body as SignupInput;

    const newUser = await prisma.user.create({
        data: {
            firstName,
            lastName,
            username,
            email,
            password: await hashPassword(password),
            status,
        },
        omit: publicUserOmit,
    });

    sendAuthResponse(
        newUser.id,
        withResolvedProfileImage(req, newUser),
        StatusCode.Created,
        res,
    );
});

export const login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body as LoginInput;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await correctPassword(password, user.password))) {
        return next(
            new AppError(
                'Invalid email or password. Please check your credentials.',
                StatusCode.Unauthorized,
            ),
        );
    }

    const {
        password: _password,
        passwordChangedAt: _passwordChangedAt,
        email: _email,
        role: _role,
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        ...publicUser
    } = user;

    sendAuthResponse(
        user.id,
        withResolvedProfileImage(req, publicUser),
        StatusCode.Ok,
        res,
    );
});

export const protect = catchAsync(async (req, _res, next) => {
    let jwt = '';
    const { authorization } = req.headers;
    if (authorization?.startsWith('Bearer ')) {
        jwt = authorization.split(' ')[1];
    }

    if (!jwt) {
        return next(
            new AppError(
                'You are not logged in. Please login to get access.',
                StatusCode.Unauthorized,
            ),
        );
    }

    const decoded = await verifyJWT(jwt).catch(() => null);
    if (!decoded) {
        return next(
            new AppError(
                'Invalid token. Please log in again.',
                StatusCode.Unauthorized,
            ),
        );
    }

    const currentUser = await prisma.user.findUnique({
        where: { id: decoded.id },
    });
    if (!currentUser) {
        return next(
            new AppError(
                'The user associated with this token no longer exists. Please log in again.',
                StatusCode.Unauthorized,
            ),
        );
    }

    if (
        hasPasswordChangedAfterJWT(currentUser.passwordChangedAt, decoded.iat)
    ) {
        return next(
            new AppError(
                'The user recently changed the password. Please log in again.',
                StatusCode.Unauthorized,
            ),
        );
    }

    req.user = currentUser;
    next();
});

export const restrictTo = (...roles: Array<UserRole>) => {
    return (req: Request, _res: Response, next: NextFunction) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError(
                    'You do not have permission to perform this action.',
                    StatusCode.Forbidden,
                ),
            );
        }
        next();
    };
};

export const updateMyPassword = catchAsync(async (req, res, next) => {
    const { currentPassword, password } = req.body as UpdateMyPasswordInput;

    const user = await prisma.user.findUniqueOrThrow({
        where: { id: req.user.id },
    });

    if (!(await correctPassword(currentPassword, user.password))) {
        return next(
            new AppError(
                'Your current password is incorrect. Please provide the correct current password.',
                StatusCode.Unauthorized,
            ),
        );
    }

    const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
            password: await hashPassword(password),
            passwordChangedAt: new Date(Date.now() - 1000),
        },
        omit: publicUserOmit,
    });

    sendAuthResponse(
        updatedUser.id,
        withResolvedProfileImage(req, updatedUser),
        StatusCode.Ok,
        res,
    );
});
