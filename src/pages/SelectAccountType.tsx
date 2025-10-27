import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, User } from "lucide-react";

const SelectAccountType = () => {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<"client" | "business" | null>(null);

  const handleSelectType = (type: "client" | "business") => {
    setSelectedType(type);
    setTimeout(() => {
      navigate(`/complete-profile?userType=${type}`);
    }, 300);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Escolha o tipo de conta</CardTitle>
          <CardDescription className="text-lg">
            Como você deseja usar o ATLAS?
          </CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <button
            onClick={() => handleSelectType("client")}
            className={`p-8 rounded-lg border-2 transition-all hover:shadow-lg ${
              selectedType === "client"
                ? "border-primary bg-primary/5 shadow-lg scale-105"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Cliente</h3>
                <p className="text-muted-foreground text-sm">
                  Agendar serviços de beleza e bem-estar
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleSelectType("business")}
            className={`p-8 rounded-lg border-2 transition-all hover:shadow-lg ${
              selectedType === "business"
                ? "border-primary bg-primary/5 shadow-lg scale-105"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Empresa</h3>
                <p className="text-muted-foreground text-sm">
                  Oferecer serviços e gerenciar agendamentos
                </p>
              </div>
            </div>
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SelectAccountType;
