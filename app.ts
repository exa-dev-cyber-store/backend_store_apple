import dotenv from 'dotenv';
dotenv.config();

import express, { Application, Request, Response } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import cors from 'cors';
import helmet from 'helmet';

import routerCategories from './app/categories/router';
import routerProducts from './app/products/router';
import routerUsers from './app/users/router';
import routerCarts from './app/cart/router';
import routerLikes from './app/likes/router';
import routerOrder from './app/orders/router';
import routerInvoices from './app/invoices/router';
import routerDeliveryAddresses from './app/deliveryAddress/router';
import routerTransactions from './app/dashboard/router';
import routerVouchers from './app/vouchers/router';
import routerNotifications from './app/notifications/router';
import ErrorHandler from './middleware/errorHandler';

const app: Application = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: false, // Allow public image assets to be loaded by frontends
}));

app.use(cors({
  origin: true,
  credentials: true,
}));

// Request parsing & static assets
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '/public')));

// Root & Health check
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Apple Store API',
    data: {
      app: 'Apple Store Backend',
      status: 'running',
      time: new Date().toISOString(),
    },
    code: 'SUCCESS',
  });
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Health check completed',
    data: {
      status: 'healthy',
      time: new Date().toISOString(),
    },
    code: 'SUCCESS',
  });
});

// Feature routes
app.use('/api', routerCategories);
app.use('/api', routerProducts);
app.use('/api', routerCarts);
app.use('/api', routerLikes);
app.use('/api', routerOrder);
app.use('/api', routerInvoices);
app.use('/api', routerDeliveryAddresses);
app.use('/api', routerTransactions);
app.use('/api', routerUsers);
app.use('/api', routerVouchers);
app.use('/api', routerNotifications);
app.use('/auth', routerUsers);

// 404 Not Found Handler
app.use(ErrorHandler.notFound);

// Global Centralized Error Handler
app.use(ErrorHandler.middleware);

export default app;