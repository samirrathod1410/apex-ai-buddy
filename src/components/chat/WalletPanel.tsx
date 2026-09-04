import { Wallet } from "lucide-react";

export function WalletPanel() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-20 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-secondary">
        <Wallet className="h-5 w-5 text-primary" />
      </span>
      <h2 className="mt-4 text-xl font-semibold tracking-tight">Wallet</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Credits and billing aren't set up for this workspace yet, so there's no balance to show.
        This section will display your real usage once billing is enabled.
      </p>
      <span className="mt-4 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
        Coming soon
      </span>
    </div>
  );
}
