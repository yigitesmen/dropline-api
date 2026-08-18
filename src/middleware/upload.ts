import { existsSync, mkdirSync } from 'fs';
import { unlink } from 'fs/promises';
import path from 'path';
import { Request } from 'express';
import multer from 'multer';
import { nanoid } from 'nanoid';

import AppError from '../utils/app.error';
import StatusCode from '../utils/status.code';

export const UPLOADS_DIR = path.join(__dirname, '../../uploads');

const ALLOWED_MIME_TYPES: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES[file.mimetype]) {
        return cb(
            new AppError(
                'Photo must be a JPEG, PNG, or WEBP image.',
                StatusCode.UnprocessableEntity,
            ),
        );
    }
    cb(null, true);
};

const createImageUpload = (
    urlSegment: string,
    fieldName: string,
    filenamePrefix: (req: Request) => string,
) => {
    const dir = path.join(UPLOADS_DIR, urlSegment);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }

    const storage = multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, dir),
        filename: (req, file, cb) => {
            cb(
                null,
                `${filenamePrefix(req)}-${nanoid(8)}${ALLOWED_MIME_TYPES[file.mimetype]}`,
            );
        },
    });

    const upload = multer({
        storage,
        fileFilter,
        limits: { fileSize: MAX_FILE_SIZE_BYTES },
    }).single(fieldName);

    const deleteByFilename = async (
        filename: string | null | undefined,
    ): Promise<void> => {
        if (!filename) return;

        try {
            await unlink(path.join(dir, filename));
        } catch (error) {
            console.warn(`Failed to delete image '${filename}' from ${urlSegment}:`, error);
        }
    };

    return { dir, upload, deleteByFilename };
};

const profileImages = createImageUpload('profile-images', 'photo', req => req.user.username);
const chatImages = createImageUpload('chat-images', 'image', req => String(req.params.id));

export const PROFILE_IMAGES_DIR = profileImages.dir;
export const CHAT_IMAGES_DIR = chatImages.dir;

export const uploadPhoto = profileImages.upload;
export const uploadChatImage = chatImages.upload;

export const deleteImageByFilename = profileImages.deleteByFilename;
export const deleteChatImageByFilename = chatImages.deleteByFilename;