import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { unlink } from 'fs/promises';
import path from 'path';
import { Request } from 'express';
import multer from 'multer';

import AppError from '../utils/app.error';
import StatusCode from '../utils/status.code';

export const UPLOADS_DIR = path.join(__dirname, '../../uploads');

export const PROFILE_IMAGES_DIR = path.join(
    UPLOADS_DIR,
    'profile-images',
);

if (!existsSync(PROFILE_IMAGES_DIR)) {
    mkdirSync(PROFILE_IMAGES_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, PROFILE_IMAGES_DIR),
    filename: (_req, file, cb) => {
        cb(null, `${randomUUID()}${ALLOWED_MIME_TYPES[file.mimetype]}`);
    },
});

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

export const uploadPhoto = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
}).single('photo');

export const buildPhotoUrl = (req: Request, filename: string): string =>
    `${req.protocol}://${req.get('host')}/uploads/profile-images/${filename}`;

export const deletePhotoByUrl = async (
    profileImageUrl: string | null | undefined,
): Promise<void> => {
    if (!profileImageUrl) return;

    const filename = profileImageUrl.split('/uploads/profile-images/').pop();
    if (!filename) return;

    try {
        await unlink(path.join(PROFILE_IMAGES_DIR, filename));
    } catch (error) {
        console.warn(`Failed to delete old photo '${filename}':`, error);
    }
};
