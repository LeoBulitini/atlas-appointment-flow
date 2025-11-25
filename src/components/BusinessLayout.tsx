import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import FloatingActionButton from "./FloatingActionButton";
import BottomNavigation from "./BottomNavigation";

interface BusinessLayoutProps {
  children: ReactNode;
  onQuickBooking?: () => void;
}

export default function BusinessLayout({ children, onQuickBooking }: BusinessLayoutProps) {
  const navigate = useNavigate();

  const handleQuickBooking = () => {
    // Se tem callback (está na página de clientes), usa ele
    if (onQuickBooking) {
      onQuickBooking();
    } else {
      // Senão, navega para a página de clientes com flag para abrir dialog
      navigate("/business/clients?quickBooking=true");
    }
  };

  return (
    <>
      <div className="pb-20 md:pb-0">
        {children}
      </div>
      <FloatingActionButton onQuickBooking={handleQuickBooking} />
      <BottomNavigation />
    </>
  );
}
