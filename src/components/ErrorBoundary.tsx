import React, { Component, ErrorInfo, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary capturou erro:", error, errorInfo);

    // Registrar erro no banco de dados
    supabase.functions
      .invoke("log-error", {
        body: {
          error_message: error.message,
          error_stack: error.stack,
          error_context: {
            componentStack: errorInfo.componentStack,
          },
          page_url: window.location.href,
          user_agent: navigator.userAgent,
        },
      })
      .catch((logError) => {
        console.error("Falha ao registrar erro:", logError);
      });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-md w-full p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 rounded-full bg-destructive/10">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Algo deu errado
                </h1>
                <p className="text-muted-foreground">
                  Encontramos um erro inesperado. Nossa equipe já foi notificada.
                </p>
              </div>

              {this.state.error && (
                <details className="w-full text-left">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    Detalhes técnicos
                  </summary>
                  <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                    {this.state.error.message}
                  </pre>
                </details>
              )}

              <div className="flex gap-2 w-full">
                <Button
                  onClick={this.handleReload}
                  variant="outline"
                  className="flex-1"
                >
                  Recarregar
                </Button>
                <Button onClick={this.handleGoHome} className="flex-1">
                  Ir para Início
                </Button>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
