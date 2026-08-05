import { z } from 'zod';

const firstName = z
    .string()
    .trim()
    .min(2, 'First name must be at least 2 characters long.')
    .max(20, 'First name cannot exceed 20 characters in length.');
const lastName = z
    .string()
    .trim()
    .min(2, 'Last name must be at least 2 characters long.')
    .max(20, 'Last name cannot exceed 20 characters in length.');
const username = z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters long.')
    .max(20, 'Username cannot exceed 20 characters in length.')
    .regex(
        /^[a-z0-9_.]+$/,
        'Username can only contain lowercase letters, numbers, underscores, and periods.',
    );
const status = z
    .string()
    .trim()
    .max(100, 'Status cannot exceed 100 characters in length.')
    .optional();
const email = z
    .string()
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address.');
const password = z
    .string()
    .min(8, 'Password must be at least 8 characters long.');

export const signupSchema = z
    .object({
        firstName,
        lastName,
        username,
        email,
        password,
        passwordConfirm: z.string(),
        status,
    })
    .refine((data) => data.password === data.passwordConfirm, {
        message: 'Passwords do not match.',
        path: ['passwordConfirm'],
    });

export const loginSchema = z.object({
    email,
    password: z.string().min(1, 'Password is required.'),
});

export const updateMeSchema = z
    .object({
        firstName: firstName.optional(),
        lastName: lastName.optional(),
        username: username.optional(),
        status,
    })
    .strict();

export const updateMyPasswordSchema = z
    .object({
        currentPassword: z.string().min(1, 'Current password is required.'),
        password,
        passwordConfirm: z.string(),
    })
    .refine((data) => data.password === data.passwordConfirm, {
        message: 'Passwords do not match.',
        path: ['passwordConfirm'],
    });

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type UpdateMyPasswordInput = z.infer<typeof updateMyPasswordSchema>;
