import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import userRouter from './routes/user.routes';
import { UPLOADS_DIR } from './middleware/upload';
import AppError from './utils/app.error';
import StatusCode from './utils/status.code';
import globalErrorController from './controllers/error.controller';

export function createApp(): Express {
    const app = express();

    app.use(helmet());
    app.use(cors());

    if (process.env.NODE_ENV === 'development') {
        app.use(morgan('dev'));
    }

    app.use(express.json({ limit: '10kb' }));
    app.use('/uploads', express.static(UPLOADS_DIR));

    app.get('/health', (_req: Request, res: Response) => {
        res.json({ status: 'ok' });
    });

    app.use('/api/v1/users', userRouter);

    app.use((req, _res, next) => {
        next(
            new AppError(
                `The requested URL '${req.originalUrl}' was not found on this server.`,
                StatusCode.NotFound,
            ),
        );
    });

    app.use(globalErrorController);

    return app;
}
