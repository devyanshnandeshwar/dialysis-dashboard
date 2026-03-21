import DialysisSession from '../models/Session';
import { MACHINES } from '../config/machines';
import { getTodayRange } from '../utils/dateUtils';

export class MachineService {
    static async getMachinesWithStatus() {
        const { start: startOfDay, end: endOfDay } = getTodayRange();

        const activeSessions = await DialysisSession.find(
            {
                scheduledDate: { $gte: startOfDay, $lte: endOfDay },
                status: { $in: ['not_started', 'in_progress'] },
                machineId: { $ne: null },
            },
            { machineId: 1 }
        ).lean();

        const inUseMachineIds = activeSessions
            .map((session: any) => session.machineId)
            .filter((machineId): machineId is string => Boolean(machineId));

        return MACHINES.map((machine) => ({
            ...machine,
            status: inUseMachineIds.includes(machine.id) ? 'in_use' : 'available',
        }));
    }
}
