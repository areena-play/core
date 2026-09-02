import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (err: any) {
            if (err instanceof ZodError || err?.name === 'ZodError' || Array.isArray(err?.issues)) {
                const issues = err.errors || err.issues || [];
                const details = issues.map((e: any) => ({
                    path: Array.isArray(e.path) ? e.path.join('.') : e.path,
                    message: e.message,
                }));
                const detailedMessage = details
                    .map((d: any) => (d.path ? `${d.path}: ${d.message}` : d.message))
                    .join(', ');

                return res.status(400).json({
                    error: detailedMessage ? `Validation error (${detailedMessage})` : 'Validation error',
                    message: detailedMessage ? `Validation error: ${detailedMessage}` : 'Validation error',
                    details,
                });
            }
            next(err);
        }
    };
}

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
    if (err instanceof ZodError || err?.name === 'ZodError' || Array.isArray(err?.issues)) {
        const issues = err.errors || err.issues || [];
        const details = issues.map((e: any) => ({
            path: Array.isArray(e.path) ? e.path.join('.') : e.path,
            message: e.message,
        }));
        const detailedMessage = details
            .map((d: any) => (d.path ? `${d.path}: ${d.message}` : d.message))
            .join(', ');

        return res.status(400).json({
            error: detailedMessage ? `Validation error (${detailedMessage})` : 'Validation error',
            message: detailedMessage ? `Validation error: ${detailedMessage}` : 'Validation error',
            details,
        });
    }
    console.error('[Error Handler]', err);
    const status = err.status || 500;
    res.status(status).json({
        error: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    });
}
