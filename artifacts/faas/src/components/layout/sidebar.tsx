import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  FileText, 
  FileBox, 
  AlertTriangle, 
  Users, 
  Truck, 
  CreditCard, 
  Download, 
  Settings,
  LogOut,
  Container
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar({ user }: { user: any }) {
  const [location] = useLocation();
  const { logout } = useAuth();

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "auditor"] },
    { href: "/invoices", label: "Invoices", icon: FileText, roles: ["admin", "auditor"] },
    { href: "/bols", label: "Bill of Lading", icon: FileBox, roles: ["admin", "auditor"] },
    { href: "/exceptions", label: "Exceptions", icon: AlertTriangle, roles: ["admin", "auditor"] },
    { href: "/clients", label: "Clients", icon: Users, roles: ["admin"] },
    { href: "/transporters", label: "Transporters", icon: Truck, roles: ["admin", "auditor"] },
    { href: "/rate-cards", label: "Rate Cards", icon: CreditCard, roles: ["admin", "auditor"] },
    { href: "/reports", label: "Reports", icon: Download, roles: ["admin", "auditor"] },
    { href: "/settings", label: "Settings", icon: Settings, roles: ["admin", "auditor"] },
  ];

  return (
    <div className="w-64 border-r bg-card h-full flex flex-col">
      <div className="h-14 border-b flex items-center px-6 shrink-0">
        <Container className="h-6 w-6 text-primary mr-2" />
        <span className="font-bold text-lg tracking-tight">FAAS</span>
      </div>
      <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
        {links.filter(link => link.roles.includes(user?.role)).map((link) => {
          const Icon = link.icon;
          const isActive = location.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </div>
      <div className="p-4 border-t">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );
}
