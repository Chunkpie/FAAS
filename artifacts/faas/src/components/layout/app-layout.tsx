import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Sidebar as SidebarComponent } from "./sidebar";
import { Loader2 } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && location !== "/login") {
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, location, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SidebarComponent user={user} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b bg-card flex items-center px-6 justify-between shrink-0">
          <h1 className="font-semibold text-lg text-foreground">Freight Audit Automation System</h1>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">{user?.username} ({user?.role})</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6 bg-background/50">
          {children}
        </main>
      </div>
    </div>
  );
}
