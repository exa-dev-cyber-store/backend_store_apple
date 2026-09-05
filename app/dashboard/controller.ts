import { Response, Request } from "express";
import Orders, { type Order } from "../orders/model";
import Users from "../users/model";
import { getSelectedView } from "../../utils";
import Products from "../products/model";
import { ApiResponse } from "../../types/response";
import ErrorHandler from "../../middleware/errorHandler";

export const getDataDashboard = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const { type = "Year" } = (req.validated?.query || req.query) as { type?: string };
    const { currentPeriode } = getSelectedView(type);
    
    const result = await Orders.aggregate([
        { $match: { status_payment: 'completed', createdAt: { $gte: currentPeriode().start, $lte: currentPeriode().end } } },
        { $group: { _id: { $month: "$createdAt" }, total: { $sum: "$total" } } },
        { $sort: { _id: 1 } },
    ]);

    // Ensure all 12 months are included in the result
    const fullYearResult = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const found = result.find(rs => rs._id === month);
        return found ? found : { _id: month, total: 0 };
    });

    const resultTotal = result.reduce((acc, curr) => acc + curr.total, 0);
    const totalProducts: number = await Products.countDocuments();
    const totalUsers: number = await Users.countDocuments();
    const totalOrders: Order[] | number = await Orders.countDocuments({ status_payment: 'completed' })
        .gte("createdAt", currentPeriode().start)
        .lte("createdAt", currentPeriode().end);

    const response = ApiResponse.success({
        totalProducts,
        resultTotal,
        totalOrders,
        totalUsers,
        dataChart: fullYearResult,
    }, 'Dashboard metrics retrieved successfully');

    res.status(200).json(response);
});