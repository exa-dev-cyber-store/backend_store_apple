import { Request, Response } from "express";
import Invoices, { Invoice } from "./model";
import { ApiResponse } from "../../types/response";
import { NotFoundError } from "../../types/errors";
import ErrorHandler from "../../middleware/errorHandler";

export const getInvoice = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const invoices: Invoice | null = await Invoices.findOne({ order: req.params.orderId }).populate({
        path: 'user',
        select: '-password -token -createdAt -updatedAt -role -cart -likes -__v'
    }).populate('order');

    if (!invoices) {
        throw new NotFoundError('Invoice not found');
    }

    const response = ApiResponse.success(invoices, 'Invoice retrieved successfully');
    res.status(200).json(response);
});