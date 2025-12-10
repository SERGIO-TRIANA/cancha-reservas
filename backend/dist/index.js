"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const courts_1 = __importDefault(require("./routes/courts"));
const reservations_1 = __importDefault(require("./routes/reservations"));
const notifications_1 = __importDefault(require("./routes/notifications"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 4000;
app.use((0, cors_1.default)({
    origin: 'http://localhost:4200',
    credentials: true
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use('/api/auth', auth_1.default);
app.use('/api', courts_1.default);
app.use('/api', reservations_1.default);
app.use('/api/notifications', notifications_1.default);
app.listen(port, () => {
    console.log(`Server listening on ${port}`);
});
