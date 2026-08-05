import StatusCode from './status.code';

export default class AppError extends Error {
    statusCode: StatusCode;
    status: string;

    constructor(message: string, statusCode: StatusCode) {
        super(message);

        this.statusCode = statusCode;
        this.status = String(statusCode).startsWith('4') ? 'fail' : 'error';

        Error.captureStackTrace(this, this.constructor);
    }
}
