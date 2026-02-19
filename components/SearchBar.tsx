import { Search } from "lucide-react";
import { useEffect, useRef } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedOnChange = useDebouncedCallback((newValue: string) => {
    if (newValue.length >= 3 || newValue.length === 0) {
      onChange(newValue);
    }
  }, 500);

  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [value]);

  return (
    <div className="relative w-full sm:w-auto">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-secondary-content" />
      <Input
        ref={inputRef}
        type="search"
        placeholder="Search feeds..."
        className="w-full sm:w-[250px] pl-8"
        defaultValue={value}
        onChange={(e) => {
          debouncedOnChange(e.target.value);
        }}
      />
    </div>
  );
}
