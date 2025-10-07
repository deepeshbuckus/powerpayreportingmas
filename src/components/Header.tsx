import { Button } from "@/components/ui/button";
import { FileText, Settings, User, LayoutDashboard, ArrowLeft } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useReports } from "@/contexts/ReportContext";

export const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentReport } = useReports();
  
  const handleBack = () => {
    navigate(-1);
  };
  
  const showBackButton = location.pathname !== "/dashboard";
  
  return (
    <header className="h-12 border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 flex items-center justify-between px-4">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2 px-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          )}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-primary rounded flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">Payroll Intelligence</span>
          </Link>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm">
          <Settings className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm">
          <User className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
};