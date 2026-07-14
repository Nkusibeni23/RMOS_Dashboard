// Compact, consistent icon set (stroke-based, inherits currentColor). Used across action + kiosk
// buttons for scannability. 18px default; pass size to override.

type P = { size?: number; className?: string };

function S({ size = 18, className, children }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const LocateIcon = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </S>
);
export const RingIcon = (p: P) => (
  <S {...p}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </S>
);
export const LockIcon = (p: P) => (
  <S {...p}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </S>
);
export const UnlockIcon = (p: P) => (
  <S {...p}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 7.9-1" />
  </S>
);
export const MessageIcon = (p: P) => (
  <S {...p}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
  </S>
);
export const WipeIcon = (p: P) => (
  <S {...p}>
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" />
  </S>
);
export const KioskIcon = (p: P) => (
  <S {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 9h6v6H9z" />
  </S>
);
export const RebootIcon = (p: P) => (
  <S {...p}>
    <path d="M21 12a9 9 0 1 1-3-6.7" />
    <path d="M21 3v5h-5" />
  </S>
);
export const RefreshIcon = (p: P) => (
  <S {...p}>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    <path d="M3 21v-5h5" />
  </S>
);
export const CameraIcon = (p: P) => (
  <S {...p}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </S>
);
export const InstallIcon = (p: P) => (
  <S {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5 5 5-5M12 15V3" />
  </S>
);
export const ListIcon = (p: P) => (
  <S {...p}>
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </S>
);
export const ShieldIcon = (p: P) => (
  <S {...p}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </S>
);

// Client type: Organization (building) / Person (user).
export const OrgIcon = (p: P) => (
  <S {...p}>
    <path d="M3 21h18" />
    <path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" />
    <path d="M15 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4" />
    <path d="M9 7h2M9 11h2M9 15h2" />
  </S>
);

export const PersonIcon = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
  </S>
);
