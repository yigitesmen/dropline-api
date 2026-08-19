import { Request, Response, NextFunction } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { MulterError } from 'multer';

import { Prisma } from '../generated/prisma/client';
import AppError from '../utils/app.error';
import StatusCode from '../utils/status.code';

const handleMulterError = (error: MulterError): AppError => {
    if (error.code === 'LIMIT_FILE_SIZE') {
        return new AppError(
            'Photo must be smaller than 5MB.',
            StatusCode.UnprocessableEntity,
        );
    }
    return new AppError(error.message, StatusCode.UnprocessableEntity);
};

interface DuplicateFieldMeta {
    target?: string[];
    driverAdapterError?: {
        cause?: {
            constraint?: {
                index?: string;
            };
        };
    };
}

const handleDuplicateFieldError = (
    error: Prisma.PrismaClientKnownRequestError,
): AppError => {
    const meta = error.meta as DuplicateFieldMeta | undefined;

    const indexName = meta?.driverAdapterError?.cause?.constraint?.index;
    const fieldFromIndex = indexName?.match(/_([a-zA-Z0-9]+)_key$/)?.[1];

    const target = meta?.target?.join(', ') ?? fieldFromIndex ?? 'field';
    return new AppError(
        `Duplicate value for ${target}. Please use another value.`,
        StatusCode.Conflict,
    );
};

const handleRecordNotFoundError = (): AppError =>
    new AppError('No record found with that ID.', StatusCode.NotFound);

const handlePrismaKnownError = (
    error: Prisma.PrismaClientKnownRequestError,
): AppError => {
    switch (error.code) {
        case 'P2002':
            return handleDuplicateFieldError(error);
        case 'P2025':
            return handleRecordNotFoundError();
        default:
            return new AppError(
                'Something went wrong while processing your request.',
                StatusCode.BadRequest,
            );
    }
};

const toAppError = (error: Error): AppError => {
    if (error instanceof AppError) return error;
    if (error instanceof Prisma.PrismaClientKnownRequestError)
        return handlePrismaKnownError(error);
    if (error instanceof Prisma.PrismaClientValidationError) {
        return new AppError(
            'Invalid query or request parameters.',
            StatusCode.BadRequest,
        );
    }
    if (error instanceof MulterError) return handleMulterError(error);
    if (error instanceof TokenExpiredError) {
        return new AppError(
            'Your session has expired. Please log in again to continue.',
            StatusCode.Unauthorized,
        );
    }
    if (error instanceof JsonWebTokenError) {
        return new AppError(
            'Invalid token. Please log in again.',
            StatusCode.Unauthorized,
        );
    }
    return new AppError(
        'Something went wrong.',
        StatusCode.InternalServerError,
    );
};

export default (
    error: Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
) => {
    const appError = toAppError(error);
    const isDev = process.env.NODE_ENV === 'development';

    if (appError.statusCode === StatusCode.InternalServerError) {
        console.error('ERROR 💥', error);
    }

    res.status(appError.statusCode).json({
        status: appError.status,
        message: appError.message,
        ...(isDev && { originalError: error, stack: error.stack }),
    });
};
