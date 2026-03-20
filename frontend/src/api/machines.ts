import client from './client';
import type { HDMachine } from '@/types';

export const getMachines = async (): Promise<HDMachine[]> => {
    const { data } = await client.get<{ machines: HDMachine[] }>('/machines');
    return data.machines;
};
