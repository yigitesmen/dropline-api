import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRequestHandler = (
    req: Request,
    res: Response,
    next: NextFunction,
) => Promise<void>;

export default (requestHandler: AsyncRequestHandler): RequestHandler => {
    return (req, res, next) => {
        requestHandler(req, res, next).catch(next);
    };
};
