import { Input } from "@/components/ui/input";

interface LoginCodeFieldProps {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export function LoginCodeField({
  value,
  disabled = false,
  onChange,
}: LoginCodeFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="login-code" className="text-sm font-semibold text-[#334155]">
        Nhập mã đăng nhập một lần
      </label>
      <Input
        id="login-code"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="TD-ABC-123-XYZ"
        className="h-12 rounded-2xl border-[#e2e8f0] bg-[#f8fafc] text-[#334155] placeholder:text-[#94a3b8]"
        disabled={disabled}
        autoComplete="one-time-code"
      />
    </div>
  );
}
