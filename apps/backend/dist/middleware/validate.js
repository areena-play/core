"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const zod_1 = require("zod");
function validate(schema, target = 'body') {
    return (req, res, next) => {
        try {
            if (target === 'query') {
                req.query = schema.parse(req.query);
            }
            else if (target === 'params') {
                req.params = schema.parse(req.params);
            }
            else {
                req.body = schema.parse(req.body);
            }
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
