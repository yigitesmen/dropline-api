import 'dotenv/config';

import { readdirSync } from 'fs';
import { copyFile, mkdir, readdir, rm } from 'fs/promises';
import path from 'path';

import prisma from '../src/lib/prisma';
import { UserRole } from '../src/generated/prisma/enums';
import { PROFILE_IMAGES_DIR } from '../src/middleware/upload';
import { hashPassword } from '../src/services/user.service';
import usersData from './users.json';

const DEV_PROFILE_IMAGES_DIR = path.join(__dirname, 'profile-images');

interface SeedUser {
    firstName: string;
    lastName: string;
    username: string;
    profileImage?: string;
    status?: string;
    role?: UserRole;
}

interface DevUser extends SeedUser {
    email: string;
    password: string;
}

const users: DevUser[] = (usersData as SeedUser[]).reverse().map(user => ({
    ...user,
    email: `${user.username}@dropline.com`,
    password: 'password123'
}));

const syncProfileImages = async () => {
    await rm(PROFILE_IMAGES_DIR, { recursive: true, force: true });
    await mkdir(PROFILE_IMAGES_DIR, { recursive: true });

    const files = (await readdir(DEV_PROFILE_IMAGES_DIR)).filter(
        file => !file.startsWith('.'),
    );
    await Promise.all(
        files.map(file =>
            copyFile(
                path.join(DEV_PROFILE_IMAGES_DIR, file),
                path.join(PROFILE_IMAGES_DIR, file),
            ),
        ),
    );

    console.log(`Copied ${files.length} profile images.`);
};

const importData = async () => {
    await prisma.user.deleteMany();
    await syncProfileImages();

    for (const user of users) {
        await prisma.user.create({
            data: {
                ...user,
                password: await hashPassword(user.password),
            },
        });
    }

    console.log(`Imported ${users.length} users.`);
    process.exit(0);
};

const deleteData = async () => {
    const { count } = await prisma.user.deleteMany();
    await rm(PROFILE_IMAGES_DIR, { recursive: true, force: true });
    await mkdir(PROFILE_IMAGES_DIR, { recursive: true });

    console.log(`Deleted ${count} users and their profile images.`);
    process.exit(0);
};

if (process.argv[2] === '--import') {
    importData();
} else if (process.argv[2] === '--delete') {
    deleteData();
} else {
    console.log('Please provide --import or --delete as an argument.');
    process.exit(1);
}
