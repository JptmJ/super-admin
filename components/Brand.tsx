export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none" stroke="#C79B3B" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
        <path d="M16 3.8L27.2 9.7L16 16L4.8 9.7L16 3.8Z" />
        <path d="M4.8 9.7L16 16V28.2L5.5 22.4L4.8 9.7Z" />
        <path d="M27.2 9.7L16 16V28.2L26.5 22.4L27.2 9.7Z" />
      </svg>
      {!compact && (
        <b>
          Ratna<span>Grid</span>
        </b>
      )}
    </div>
  );
}
