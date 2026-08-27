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
        } catch (err) {
            if (err instanceof ZodError) {
                return res.status(400).json({
                    error: 'Validation error',
                    details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
                });
            }
            next(err);
        }
    };
}
