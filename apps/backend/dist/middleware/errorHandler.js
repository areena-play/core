"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
function validate(schema) {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        }
        catch (err) {
            if (err instanceof zod_1.ZodError) {
                return res.status(400).json({
                    error: 'Validation error',
                    details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
                });
            }
            next(err);
        }
    };
}
function errorHandler(err, req, res, next) {
    console.error('[Error Handler]', err);
    const status = err.status || 500;
    res.status(status).json({
        error: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    });
}
