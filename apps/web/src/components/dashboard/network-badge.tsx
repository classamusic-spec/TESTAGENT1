/** Static network indicator. Development targets Base Sepolia testnet only. */
export function NetworkBadge() {
  return (
    <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
      Base Sepolia · testnet
    </span>
  );
}
