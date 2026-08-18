import { Request, Response, NextFunction } from 'express';

import prisma from '../lib/prisma';
import { deleteImageByFilename } from '../middleware/upload';
import AppError from '../utils/app.error';
import catchAsync from '../utils/catch.async';
import StatusCode from '../utils/status.code';
import { UpdateMeInput } from '../validation/user.validation';
import { APIFeatures } from '../utils/api.features';

export const me = (req: Request, _res: Response, next: NextFunction) => {
    req.params.id = req.user.id;
    next();
};

export const getAllUsers = catchAsync(async (req, res) => {
    const features = new APIFeatures(
        args => prisma.user.findMany(args),
        req.query as Record<string, string>,
        ['email', 'password', 'passwordChangedAt', 'role', 'registeredAt', 'profileUpdatedAt'],
    )
        .search(['firstName', 'lastName', 'username', 'status'])
        .filter(['firstName', 'lastName', 'username', 'status'])
        .where({ id: { not: req.user.id } })
        .limitFields()
        .sort('registeredAt')
        .paginate();

    const users = await features.exec();

    res.status(StatusCode.Ok).json({
        status: 'success',
        results: users.length,
        data: { users },
    });
});

export const getUser = catchAsync(async (req, res, next) => {
    const user = await prisma.user.findUnique({
        where: { id: String(req.params.id) },
    });

    if (!user) {
        return next(
            new AppError('No user found with that ID.', StatusCode.NotFound),
        );
    }

    res.status(StatusCode.Ok).json({
        status: 'success',
        data: { user },
    });
});

export const updateUser = catchAsync(async (req, res) => {
    const uploadedFilename = req.file?.filename;

    const previousUser = uploadedFilename
        ? await prisma.user.findUnique({
            where: { id: String(req.params.id) },
            select: { profileImage: true },
        })
        : null;

    const updatedUser = await prisma.user.update({
        where: { id: String(req.params.id) },
        data: {
            ...(req.body as UpdateMeInput),
            ...(uploadedFilename && {
                profileImage: uploadedFilename,
            }),
        },
    });

    if (uploadedFilename && previousUser?.profileImage) {
        await deleteImageByFilename(previousUser.profileImage);
    }

    res.status(StatusCode.Ok).json({
        status: 'success',
        data: { user: updatedUser },
    });
});

export const deleteUser = catchAsync(async (req, res) => {
    await prisma.user.delete({ where: { id: String(req.params.id) } });

    res.status(StatusCode.NoContent).json();
});
