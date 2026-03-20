import { Request, Response, NextFunction } from 'express';
import DialysisSession from '../models/Session';
import { MACHINES } from '../config/machines';
import { getTodayRange } from '../utils/dateUtils';

export const getMachines = async (
    _req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { start: startOfDay, end: endOfDay } = getTodayRange();

        const activeToday = await DialysisSession.find(
            {
                scheduledDate: { $gte: startOfDay, $lte: endOfDay },
                status: { $in: ['not_started', 'in_progress'] },
                machineId: { $exists: true, $ne: null },
            },
            { machineId: 1 }
        ).lean();

        const inUseMachineIds = new Set(
            activeToday
                .map((session) => session.machineId)
                .filter((machineId): machineId is string => Boolean(machineId))
        );

        const machines = MACHINES.map((machine) => ({
            ...machine,
            status: inUseMachineIds.has(machine.id) ? 'in_use' : 'available',
        }));

        res.json({ machines });
    } catch (err) {
        next(err);
    }
};
