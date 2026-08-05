import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

import AppError from '../utils/app.error';
import StatusCode from '../utils/status.code';

export default (schema: ZodType) => {
    return (req: Request, _res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const message = result.error.issues
                .map((issue) => issue.message)
                .join(' ');
            return next(new AppError(message, StatusCode.UnprocessableEntity));
        }

        req.body = result.data;
        next();
    };
};
