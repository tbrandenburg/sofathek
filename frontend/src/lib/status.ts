// New file - status color mapping (centralized)
import type { QueueItem } from '../types/youtube';

export type StatusClass = 'bg-gray-100 text-gray-800' | 'bg-blue-100 text-blue-800' | 'bg-green-100 text-green-800' | 'bg-red-100 text-red-800' | 'bg-orange-100 text-orange-800';

const STATUS_COLOR_MAP: Record<QueueItem['status'], StatusClass> = {
  pending: 'bg-gray-100 text-gray-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-orange-100 text-orange-800',
};

export function getStatusColor(status: QueueItem['status']): StatusClass {
  return STATUS_COLOR_MAP[status] || 'bg-gray-100 text-gray-800';
}