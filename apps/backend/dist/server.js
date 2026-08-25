"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const env_1 = require("./config/env");
const errorHandler_1 = require("./middleware/errorHandler");
// Route imports
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const associations_routes_1 = __importDefault(require("./routes/associations.routes"));
const clubs_routes_1 = __importDefault(require("./routes/clubs.routes"));
const licenses_routes_1 = __importDefault(require("./routes/licenses.routes"));
const competitions_routes_1 = __importDefault(require("./routes/competitions.routes"));
const calendar_routes_1 = __importDefault(require("./routes/calendar.routes"));
const messages_routes_1 = __importDefault(require("./routes/messages.routes"));
const oauth_routes_1 = __importDefault(require("./routes/oauth.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const app = (0, express_1.default)();
// Middlewares
app.use((0, cors_1.default)({ origin: '*', credentials: true }));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)('dev'));
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'areena-backend',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});
// Mount Routes
app.use('/auth', auth_routes_1.default);
app.use('/associations', associations_routes_1.default);
app.use('/clubs', clubs_routes_1.default);
app.use('/licenses', licenses_routes_1.default);
app.use('/competitions', competitions_routes_1.default);
app.use('/calendar', calendar_routes_1.default);
app.use('/messages', messages_routes_1.default);
app.use('/oauth', oauth_routes_1.default);
app.use('/upload', upload_routes_1.default);
// Global Error Handler
app.use(errorHandler_1.errorHandler);
const PORT = env_1.config.port;
app.listen(PORT, () => {
    console.log(`[AREENA Backend] Server listening on port ${PORT}`);
    console.log(`[AREENA Backend] Environment: ${process.env.NODE_ENV || 'development'}`);
});
exports.default = app;
