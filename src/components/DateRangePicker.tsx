import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

interface DateRangePickerProps {
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
}

export function DateRangePicker({ dateRange, onDateRangeChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | undefined>({
    from: dateRange.from,
    to: dateRange.to,
  });

  const handleSelect = (range: DateRange | undefined) => {
    setTempRange(range);
    
    // Se ambas as datas estão selecionadas, aplicar e fechar
    if (range?.from && range?.to) {
      onDateRangeChange({ from: range.from, to: range.to });
      setIsOpen(false);
    } 
    // Se apenas a data inicial foi selecionada, manter aberto
    else if (range?.from) {
      setTempRange({ from: range.from, to: undefined });
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Reset temporary range when opening
      setTempRange({ from: dateRange.from, to: dateRange.to });
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("justify-start text-left font-normal")}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateRange.from && dateRange.to ? (
            <>
              {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
              {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
            </>
          ) : (
            <span>Selecione o período</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={tempRange}
          onSelect={handleSelect}
          numberOfMonths={2}
          className="pointer-events-auto"
          locale={ptBR}
        />
      </PopoverContent>
    </Popover>
  );
}
