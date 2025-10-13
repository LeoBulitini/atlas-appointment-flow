import { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import FloatingActionButton from "./FloatingActionButton";

interface BusinessLayoutProps {
  children: ReactNode;
  onQuickBooking?: () => void;
}

export default function BusinessLayout({ children, onQuickBooking }: BusinessLayoutProps) {
  const location = useLocation();
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
      {children}
      <FloatingActionButton onQuickBooking={handleQuickBooking} />
    </>
  );
}
