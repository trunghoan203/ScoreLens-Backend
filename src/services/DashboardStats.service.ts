import { getIO } from '../socket';
import { Table } from '../models/Table.model';
import { Membership } from '../models/Membership.model';

interface DashboardStats {
    totalTables: number;
    inUse: number;
    available: number;
    members: number;
}

export class DashboardStatsService {
    static async calculateDashboardStats(): Promise<DashboardStats> {
        try {
            const [tables, members] = await Promise.all([
                Table.find({}),
                Membership.find({})
            ]);

            const totalTables = tables.length;
            const inUse = tables.filter(table => table.status === 'inuse').length;
            const available = tables.filter(table => table.status === 'empty').length;
            const totalMembers = members.length;

            return {
                totalTables,
                inUse,
                available,
                members: totalMembers
            };
        } catch (error) {
            console.error('Error calculating dashboard stats:', error);
            return {
                totalTables: 0,
                inUse: 0,
                available: 0,
                members: 0
            };
        }
    }

    static async emitDashboardStatsUpdate() {
        try {
            const io = getIO();
            const stats = await this.calculateDashboardStats();

            // Emit cho tất cả manager
            io.to('role_manager').emit('dashboard_stats_updated', stats);

            console.log('Dashboard stats updated via WebSocket:', stats);
        } catch (error) {
            console.error('Error emitting dashboard stats:', error);
        }
    }

    static async emitDashboardStatsToSocket(socketId: string) {
        try {
            const io = getIO();
            const stats = await this.calculateDashboardStats();

            // Emit cho socket cụ thể
            io.to(socketId).emit('dashboard_stats_updated', stats);

            console.log('Dashboard stats sent to socket:', socketId, stats);
        } catch (error) {
            console.error('Error emitting dashboard stats to socket:', error);
        }
    }
}
