import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface DateRangePickerProps {
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
}

export function DateRangePicker({ dateRange, onDateRangeChange }: DateRangePickerProps) {
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const handleFromChange = (date: Date | undefined) => {
    if (date) {
      onDateRangeChange({ from: date, to: dateRange.to });
      setFromOpen(false);
    }
  };

  const handleToChange = (date: Date | undefined) => {
    if (date) {
      onDateRangeChange({ from: dateRange.from, to: date });
      setToOpen(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1">
        <Label htmlFor="data-inicial" className="mb-2 block text-sm font-medium">
          Data Inicial
        </Label>
        <Popover open={fromOpen} onOpenChange={setFromOpen}>
          <PopoverTrigger asChild>
            <Button
              id="data-inicial"
              variant="outline"
              className={cn("w-full justify-start text-left font-normal")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from ? (
                format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
              ) : (
                <span>Selecione a data inicial</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateRange.from}
              onSelect={handleFromChange}
              className="pointer-events-auto"
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex-1">
        <Label htmlFor="data-final" className="mb-2 block text-sm font-medium">
          Data Final
        </Label>
        <Popover open={toOpen} onOpenChange={setToOpen}>
          <PopoverTrigger asChild>
            <Button
              id="data-final"
              variant="outline"
              className={cn("w-full justify-start text-left font-normal")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.to ? (
                format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })
              ) : (
                <span>Selecione a data final</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateRange.to}
              onSelect={handleToChange}
              disabled={(date) => date < dateRange.from}
              className="pointer-events-auto"
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
