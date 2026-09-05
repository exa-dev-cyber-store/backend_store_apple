import DeliveryAddresses, { DeliveryAddress } from "./model";
import { Request, Response } from "express";
import { ApiResponse } from "../../types/response";
import { NotFoundError } from "../../types/errors";
import ErrorHandler from "../../middleware/errorHandler";

export const getDeliveryAddresses = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const deliveryAddresses: DeliveryAddress[] = await DeliveryAddresses.find({ user: req.user!._id });
    const response = ApiResponse.success(deliveryAddresses, 'Delivery addresses retrieved successfully');
    (response as any).deliveryAddresses = deliveryAddresses;
    res.status(200).json(response);
});

export const getDeliveryAddress = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const deliveryAddress: DeliveryAddress | null = await DeliveryAddresses.findOne({
        _id: req.params.id,
        user: req.user!._id,
    });

    if (!deliveryAddress) {
        throw new NotFoundError('Delivery address not found');
    }

    const response = ApiResponse.success(deliveryAddress, 'Delivery address retrieved successfully');
    res.status(200).json(response);
});

export const createDeliveryAddress = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const payload = { ...(req.validated?.body || req.body), user: req.user!._id };
    const deliveryAddress: DeliveryAddress = await DeliveryAddresses.create(payload);

    const response = ApiResponse.created(deliveryAddress, 'Delivery address created successfully');
    res.status(201).json(response);
});

export const updateDeliveryAddress = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const deliveryAddress: DeliveryAddress | null = await DeliveryAddresses.findOneAndUpdate(
        { _id: req.params.id, user: req.user!._id },
        { $set: (req.validated?.body || req.body) },
        { new: true, runValidators: true }
    );

    if (!deliveryAddress) {
        throw new NotFoundError('Delivery address not found');
    }

    const response = ApiResponse.success(deliveryAddress, 'Delivery address updated successfully');
    res.status(200).json(response);
});

export const deleteDeliveryAddress = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const deliveryAddress: DeliveryAddress | null = await DeliveryAddresses.findOneAndDelete({
        _id: req.params.id,
        user: req.user!._id,
    });

    if (!deliveryAddress) {
        throw new NotFoundError('Delivery address not found');
    }

    const response = ApiResponse.deleted('Delivery address deleted successfully');
    res.status(200).json(response);
});