import { Link, useNavigate } from "react-router-dom";
import { LogOut, User, Settings, ChevronDown, Menu, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { initials } from "@/lib/formatters";
import { useSchool } from "@/hooks/school/useSchool";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Avatar,
  AvatarFallback,
  Button,
} from "@/components/ui";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const { data: school } = useSchool();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      {/* Gauche : burger mobile + nom école */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="hidden md:flex items-center gap-2">
          <span className="text-sm font-semibold text-muted-foreground">
            {school?.name || "Établissement"}
          </span>
        </div>
      </div>

      {/* Droite : cloche + user */}
      <div className="flex items-center gap-2">
        {/* Cloche notifications */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative"
          title="Notifications"
         onClick={() => navigate("/notifications")}>
          <Bell className="h-5 w-5" />
          
        </Button>

        {/* Menu utilisateur */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {user ? initials(user.firstName, user.lastName) : "??"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-xs font-semibold leading-tight">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  {user?.roles?.[0] ? (user.roles[0] === "SECRETARY" ? "Secrétaire" : user.roles[0] === "ACCOUNTANT" ? "Comptable" : user.roles[0] === "TEACHER" ? "Enseignant" : user.roles[0] === "DIRECTOR" ? "Directeur" : user.roles[0]) : ""}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user?.firstName} {user?.lastName}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings className="h-4 w-4 mr-2" />
              Paramètres
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
