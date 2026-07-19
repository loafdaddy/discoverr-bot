/**
 * Seerr MediaStatus enum (numeric).
 * @see https://github.com/seerr-team/seerr/blob/develop/server/constants/media.ts
 */
export enum MediaStatus {
  UNKNOWN = 1,
  PENDING = 2,
  PROCESSING = 3,
  PARTIALLY_AVAILABLE = 4,
  AVAILABLE = 5,
  BLACKLISTED = 6,
  DELETED = 7
}

const SKIP_STATUSES = new Set<number>([
  MediaStatus.PENDING,
  MediaStatus.PROCESSING,
  MediaStatus.PARTIALLY_AVAILABLE,
  MediaStatus.AVAILABLE,
  MediaStatus.BLACKLISTED
]);

export function shouldSkipMediaStatus(status: unknown): boolean {
  if (typeof status === "number" && SKIP_STATUSES.has(status)) {
    return true;
  }
  if (typeof status === "string") {
    const asNumber = Number(status);
    if (Number.isFinite(asNumber) && SKIP_STATUSES.has(asNumber)) {
      return true;
    }
    return /(available|requested|partially|pending|processing|downloading|queued|owned|blacklisted)/i.test(
      status
    );
  }
  return false;
}

export interface SeerrMediaDetails {
  status?: number | string;
  status4k?: number | string;
  mediaInfo?: {
    status?: number | string;
    status4k?: number | string;
  };
  media?: {
    status?: number | string;
    status4k?: number | string;
  };
  [key: string]: unknown;
}

export function isUnavailableFromDetails(details: SeerrMediaDetails | null | undefined): boolean {
  if (!details) return false;

  const candidates = [
    details.status,
    details.status4k,
    details.mediaInfo?.status,
    details.mediaInfo?.status4k,
    details.media?.status,
    details.media?.status4k
  ];

  return candidates.some((status) => shouldSkipMediaStatus(status));
}
