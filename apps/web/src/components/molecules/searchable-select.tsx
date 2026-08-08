"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
  group?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  value,
  options,
  onValueChange,
  placeholder,
  searchPlaceholder = "Tìm kiếm...",
  emptyText = "Không tìm thấy kết quả.",
  groupOrder,
  disabled = false,
  triggerId,
  contentClassName,
}: {
  value: string;
  options: SearchableSelectOption[];
  onValueChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  groupOrder?: string[];
  disabled?: boolean;
  triggerId?: string;
  contentClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const groups = useMemo(() => {
    const fallback = Array.from(
      new Set(options.map((option) => option.group).filter(Boolean) as string[]),
    );
    return groupOrder?.length ? groupOrder : fallback;
  }, [groupOrder, options]);
  const ungrouped = options.filter((option) => !option.group);

  function renderOptions(items: SearchableSelectOption[]) {
    return items.map((option) => (
      <CommandItem
        key={option.value}
        value={option.label}
        disabled={option.disabled}
        onSelect={() => {
          onValueChange(option.value);
          setOpen(false);
        }}
      >
        <Check
          className={cn(
            "mr-2 size-4",
            value === option.value ? "opacity-100" : "opacity-0",
          )}
        />
        {option.label}
      </CommandItem>
    ));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={triggerId}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {selected?.label ?? placeholder}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-(--radix-popover-trigger-width) p-0", contentClassName)}
        align="start"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {ungrouped.length ? <CommandGroup>{renderOptions(ungrouped)}</CommandGroup> : null}
            {groups.map((group) => {
              const grouped = options.filter((option) => option.group === group);
              return grouped.length ? (
                <CommandGroup key={group} heading={group}>
                  {renderOptions(grouped)}
                </CommandGroup>
              ) : null;
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
