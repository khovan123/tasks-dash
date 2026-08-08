interface LoginCodeDisplayProps {
  code: string;
  expiresLabel: string | null;
}

export function LoginCodeDisplay({ code, expiresLabel }: LoginCodeDisplayProps) {
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
        Mã hiện tại
      </div>
      <div className="mt-2 font-heading text-3xl font-black tracking-[0.24em] text-foreground">
        {code}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {expiresLabel
          ? `Hết hạn lúc ${expiresLabel}. Mã mới sẽ ghi đè mã cũ.`
          : "Mã mới sẽ ghi đè mã cũ."}
      </p>
    </div>
  );
}
