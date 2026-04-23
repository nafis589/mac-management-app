import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import logger from "./utils/logger.js";
import "./config/database.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors({
    origin: 'http://localhost:3000'
}));
app.use(express.json());

import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

app.get("/", (req: Request, res: Response) => {
    res.send("API is running");
});

// Centralized error handling
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error(err.stack || err.message);
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({ success: false, error: message });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
});