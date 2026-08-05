import { Request, Response, NextFunction } from 'express';

import prisma from '../lib/prisma';
import { buildPhotoUrl, deletePhotoByUrl } from '../middleware/upload';
import AppError from '../utils/app.error';
import catchAsync from '../utils/catch.async';
import StatusCode from '../utils/status.code';
import { publicUserSelect } from '../services/user.service';
import { UpdateMeInput } from '../validation/user.validation';

export const me = (req: Request, _res: Response, next: NextFunction) => {
    req.params.id = req.user.id;
    next();
};

export const getAllUsers = catchAsync(async (_req, res) => {
    const users = await prisma.user.findMany({ select: publicUserSelect });

    res.status(StatusCode.Ok).json({
        status: 'success',
        results: users.length,
        data: { users },
    });
});

export const getUser = catchAsync(async (req, res, next) => {
    const user = await prisma.user.findUnique({
        where: { id: String(req.params.id) },
        select: publicUserSelect,
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
    const profileImageUrl = req.file
        ? buildPhotoUrl(req, req.file.filename)
        : undefined;

    const previousUser = profileImageUrl
        ? await prisma.user.findUnique({
              where: { id: String(req.params.id) },
              select: { profileImageUrl: true },
          })
        : null;

    const updatedUser = await prisma.user.update({
        where: { id: String(req.params.id) },
        data: {
            ...(req.body as UpdateMeInput),
            ...(profileImageUrl && { profileImageUrl }),
        },
        select: publicUserSelect,
    });

    if (profileImageUrl && previousUser?.profileImageUrl) {
        await deletePhotoByUrl(previousUser.profileImageUrl);
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
