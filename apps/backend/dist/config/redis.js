"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisPub = exports.redis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
exports.redis = new ioredis_1.default(env_1.config.redisUrl, {
    retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        return delay;
    },
    maxRetriesPerRequest: null,
    lazyConnect: true,
});
exports.redisPub = new ioredis_1.default(env_1.config.redisUrl, {
    lazyConnect: true,
});
exports.redis.on('error', (err) => {
    console.warn('[Redis] Client error (operating in offline fallback mode if unavailable):', err.message);
});
exports.redisPub.on('error', (err) => {
    console.warn('[Redis Pub] Client error (operating in offline fallback mode if unavailable):', err.message);
});
