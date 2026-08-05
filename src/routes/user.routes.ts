import express from 'express';

import {
    signup,
    login,
    protect,
    restrictTo,
    updateMyPassword,
} from '../controllers/auth.controller';
import {
    me,
    getAllUsers,
    getUser,
    updateUser,
    deleteUser,
} from '../controllers/user.controller';
import { UserRole } from '../generated/prisma/enums';
import validate from '../middleware/validate';
import { uploadPhoto } from '../middleware/upload';
import {
    signupSchema,
    loginSchema,
    updateMeSchema,
    updateMyPasswordSchema,
} from '../validation/user.validation';

const router = express.Router();

router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);

router.use(protect);

router.get('/me', me, getUser);
router.patch(
    '/updateMe',
    uploadPhoto,
    validate(updateMeSchema),
    me,
    updateUser,
);
router.patch(
    '/updateMyPassword',
    validate(updateMyPasswordSchema),
    updateMyPassword,
);

router.get('/', getAllUsers);

router
    .route('/:id')
    .get(getUser)
    .patch(
        restrictTo(UserRole.ADMIN),
        uploadPhoto,
        validate(updateMeSchema),
        updateUser,
    )
    .delete(restrictTo(UserRole.ADMIN), deleteUser);

export default router;
