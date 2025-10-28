import { useState, useCallback } from 'react';
import { Active, DragEndEvent, DragStartEvent, DragMoveEvent } from '@dnd-kit/core';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  end_time: string;
  status: string;
}

interface UseDraggableAppointmentProps {
  appointments: Appointment[];
  onUpdate: () => void;
}

export const useDraggableAppointment = ({ appointments, onUpdate }: UseDraggableAppointmentProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedTime, setDraggedTime] = useState<string | null>(null);

  // Snap time to 5-minute intervals
  const snapToGrid = (timeString: string): string => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const snappedMinutes = Math.round(minutes / 5) * 5;
    const adjustedHours = snappedMinutes === 60 ? hours + 1 : hours;
    const finalMinutes = snappedMinutes === 60 ? 0 : snappedMinutes;
    return `${String(adjustedHours).padStart(2, '0')}:${String(finalMinutes).padStart(2, '0')}`;
  };

  // Calculate new time based on vertical drag distance
  const calculateNewTime = (originalTime: string, deltaY: number): string => {
    const [hours, minutes] = originalTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    
    // Each 12px = 5 minutes (approx 1 hour = 144px)
    const minutesDelta = Math.round(deltaY / 12) * 5;
    const newTotalMinutes = Math.max(0, Math.min(1435, totalMinutes + minutesDelta)); // 0-23:55
    
    const newHours = Math.floor(newTotalMinutes / 60);
    const newMinutes = newTotalMinutes % 60;
    
    return snapToGrid(`${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`);
  };

  // Calculate end time based on start time and duration
  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  };

  // Check for time conflicts
  const checkConflict = (
    appointmentId: string,
    date: string,
    newStartTime: string,
    newEndTime: string
  ): boolean => {
    return appointments.some(apt => {
      if (apt.id === appointmentId) return false;
      if (apt.appointment_date !== date) return false;
      if (apt.status === 'cancelled' || apt.status === 'completed') return false;

      const aptStart = apt.appointment_time;
      const aptEnd = apt.end_time;

      return (newStartTime < aptEnd && newEndTime > aptStart);
    });
  };

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    if (!activeId) return;

    const appointment = appointments.find(apt => apt.id === activeId);
    if (!appointment) return;

    const deltaY = event.delta.y;
    const newTime = calculateNewTime(appointment.appointment_time, deltaY);
    setDraggedTime(newTime);
  }, [activeId, appointments]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    if (!activeId) return;

    const appointment = appointments.find(apt => apt.id === activeId);
    if (!appointment) {
      setActiveId(null);
      setDraggedTime(null);
      return;
    }

    const deltaY = event.delta.y;
    const newStartTime = calculateNewTime(appointment.appointment_time, deltaY);
    
    // Calculate duration and new end time
    const [startHours, startMinutes] = appointment.appointment_time.split(':').map(Number);
    const [endHours, endMinutes] = appointment.end_time.split(':').map(Number);
    const durationMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
    const newEndTime = calculateEndTime(newStartTime, durationMinutes);

    // Check for conflicts
    const hasConflict = checkConflict(
      appointment.id,
      appointment.appointment_date,
      newStartTime,
      newEndTime
    );

    if (hasConflict) {
      toast.error('Conflito de horário! Já existe um agendamento neste horário.');
      setActiveId(null);
      setDraggedTime(null);
      return;
    }

    // No significant change
    if (newStartTime === appointment.appointment_time) {
      setActiveId(null);
      setDraggedTime(null);
      return;
    }

    try {
      // Update appointment
      const { error } = await supabase
        .from('appointments')
        .update({
          appointment_time: newStartTime,
          end_time: newEndTime,
        })
        .eq('id', appointment.id);

      if (error) throw error;

      // Send notification email
      await supabase.functions.invoke('send-appointment-email', {
        body: {
          appointmentId: appointment.id,
          type: 'rescheduled',
        },
      });

      toast.success('Horário alterado com sucesso!');
      onUpdate();
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Erro ao alterar horário');
    }

    setActiveId(null);
    setDraggedTime(null);
  }, [activeId, appointments, onUpdate]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setDraggedTime(null);
  }, []);

  return {
    activeId,
    draggedTime,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
  };
};
