interface AuthErrorAlertProps {
  message: string;
  className?: string;
}

export function AuthErrorAlert({ message, className }: AuthErrorAlertProps) {
  return (
    <div
      role="alert"
      className={`rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive ${className ?? ""}`.trim()}
    >
      {message}
    </div>
  );
}
