import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema, target: 'body' | 'query' | 'params' = 'body') {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            if (target === 'query') {
                req.query = schema.parse(req.query);
            } else if (target === 'params') {
                req.params = schema.parse(req.params);
            } else {
                req.body = schema.parse(req.body);
            }
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
