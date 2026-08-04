import * as AvatarPrimitive from "@radix-ui/react-avatar";
const AVATAR_SIZES = { small: "sm", medium: "md" } as const;
type AvatarSize = (typeof AVATAR_SIZES)[keyof typeof AVATAR_SIZES];
export function Avatar({ name, src, size = AVATAR_SIZES.medium }: { name: string; src?: string; size?: AvatarSize }) { const cls = size === AVATAR_SIZES.small ? "size-7 text-[10px]" : "size-9 text-xs"; return <AvatarPrimitive.Root className={`${cls} inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 font-bold text-indigo-700 ring-2 ring-white`}><AvatarPrimitive.Image src={src} alt={name} /><AvatarPrimitive.Fallback>{name.split(" ").map((part) => part[0]).slice(0,2).join("")}</AvatarPrimitive.Fallback></AvatarPrimitive.Root>; }
