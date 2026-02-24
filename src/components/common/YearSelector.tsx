import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { useAcademicYears, useCurrentAcademicYear } from '@/hooks/useSupabaseData';
import { useEffect } from 'react';

interface YearSelectorProps {
  value: number | null;
  onValueChange: (year: number) => void;
  className?: string;
  allowedYears?: number[];
}

export function YearSelector({ value, onValueChange, className, allowedYears }: YearSelectorProps) {
  const { data: years = [], isLoading } = useAcademicYears();
  const { data: currentYear } = useCurrentAcademicYear();

  // Set default to current year when component mounts
  useEffect(() => {
    if (!value && currentYear) {
      onValueChange(currentYear.year_number);
    }
  }, [currentYear, value, onValueChange]);

  if (isLoading) {
    return (
      <div className="w-[200px] h-10 rounded-xl bg-muted animate-pulse" />
    );
  }

  const activeYears = years.filter(y => {
    if (allowedYears && allowedYears.length > 0) {
      if (!allowedYears.includes(y.year_number)) return false;
    }
    return y.is_active || y.year_number === value;
  });

  return (
    <Select
      value={value?.toString() || currentYear?.year_number.toString()}
      onValueChange={(val) => onValueChange(parseInt(val))}
    >
      <SelectTrigger className={`rounded-xl ${className || 'w-[200px]'}`}>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="เลือกปีการศึกษา" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {activeYears.map((year) => (
          <SelectItem key={year.id} value={year.year_number.toString()}>
            <div className="flex items-center gap-2">
              {year.display_name}
              {year.is_current && (
                <span className="text-xs text-emerald-600 font-medium">(ปัจจุบัน)</span>
              )}
              {!year.is_active && (
                <span className="text-xs text-muted-foreground font-medium">(เก็บถาวร)</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
