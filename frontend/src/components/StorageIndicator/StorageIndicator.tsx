import { useQuery } from '@tanstack/react-query';
import { formatFileSize, getStorageInfo } from '../../services/api';

export function StorageIndicator() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['storage'], queryFn: getStorageInfo, refetchInterval: 15000, refetchOnWindowFocus: true
  });

  return <section className="mb-6 rounded-lg border border-white/10 bg-white/5 p-4" aria-label="Media storage">
    <h2 className="mb-2 text-lg font-semibold">Media Storage</h2>
    {isLoading ? <p>Loading storage information…</p> : isError || !data ? <p role="status">Storage information is currently unavailable.</p> : <>
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <span>Sofathek media: {formatFileSize(data.occupiedBytes)} occupied</span>
        <span>Filesystem capacity: {formatFileSize(data.totalBytes)}</span>
        <span>Remaining for additional Sofathek downloads: {formatFileSize(data.downloadableBytes)}</span>
        <span>Filesystem free: {formatFileSize(data.filesystemFreeBytes)}</span>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded bg-white/15" role="progressbar" aria-label="Filesystem capacity used by Sofathek media"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(data.percentUsed)}>
        <div className="h-full bg-sky-500" style={{ width: `${data.percentUsed}%` }} />
      </div>
      <p className="mt-1 text-sm">{Math.round(data.percentUsed)}% of filesystem capacity occupied by media</p>
    </>}
  </section>;
}
