import { Request, Response, NextFunction } from 'express';
import { MachineService } from '../services/machineService';

export const getMachines = async (
    _req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const machines = await MachineService.getMachinesWithStatus();
        res.json({ machines });
    } catch (err) {
        next(err);
    }
};
