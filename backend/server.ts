import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import logger from "./utils/logger.js";
import "./config/database.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors({
    origin: 'http://localhost:3000'
}));
app.use(express.json());

// Servir les fichiers uploadés (photos produits) en statique
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import productsRoutes from './routes/products.routes.js';
import categoriesRoutes from './routes/categories.routes.js';
import brandsRoutes from './routes/brands.routes.js';
import stockRoutes from './routes/stock.routes.js';
import salesRoutes from './routes/sales.routes.js';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/brands', brandsRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/sales', salesRoutes);

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