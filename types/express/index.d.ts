declare namespace Express {
  interface Request {
    user?: {
      _id: any;
      userId?: any;
      name: string;
      email: string;
      role: string;
      [key: string]: any;
    };
    validated?: Record<string, any>;
  }
}