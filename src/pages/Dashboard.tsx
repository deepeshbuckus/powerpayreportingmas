import { useState } from "react";
import { useReports } from "@/contexts/ReportContext";
import { useNavigate } from "react-router-dom";
import { usePowerPayClient, useReports as usePowerPayReports, useSaveReport } from "@/hooks/usePowerPay";
import type { UUID } from "@/lib/powerpay-api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  Plus, 
  FileText, 
  Calendar, 
  MoreVertical,
  Copy,
  Edit,
  Trash2,
  Eye,
  DollarSign,
  Users,
  TrendingUp,
  Lightbulb,
  Send,
  Clock,
  Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { SaveReportDialog } from "@/components/SaveReportDialog";
import { useToast } from "@/hooks/use-toast";

interface Report {
  conversationId: string;
  defaultTitle: string;
  reportName: string;
  createdAt: string;
  mapped: boolean;
}


const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { startNewChat } = useReports();
  const powerPayClient = usePowerPayClient({ 
    baseUrl: import.meta.env.VITE_POWERPAY_API_URL || 'http://localhost:8383',
    token: import.meta.env.VITE_POWERPAY_BEARER_TOKEN
  });
  const { data: powerPayReports, isLoading: loading } = usePowerPayReports(powerPayClient);
  const saveReportMutation = useSaveReport(powerPayClient);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatInput, setChatInput] = useState("");

  // Transform PowerPay reports to Dashboard report format
  const reports: Report[] = (powerPayReports || []).map(r => ({
    conversationId: r.report_id || '',
    defaultTitle: r.description || 'Untitled Report',
    reportName: r.name || '',
    createdAt: new Date().toISOString(),
    mapped: !!r.name
  }));

  const [isStartingChat, setIsStartingChat] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [currentReportId, setCurrentReportId] = useState<UUID | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState("");

  const handleChatRedirect = async () => {
    if (!chatInput.trim() || isStartingChat) return;
    
    setIsStartingChat(true);
    try {
      // Call POST /conversations/start
      const response = await powerPayClient.startConversation({
        prompt: chatInput
      });
      
      // Store the prompt and reportId for the dialog
      setCurrentPrompt(chatInput);
      setCurrentReportId(response.report_id);
      setChatInput(""); // Clear input
      
      // Open the save report dialog
      setSaveDialogOpen(true);
    } catch (error) {
      console.error('Failed to start conversation:', error);
      toast({
        title: "Error",
        description: "Failed to start conversation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleEditReport = async (conversationId: string) => {
    try {
      const response = await powerPayClient.getConversationMessages(conversationId as UUID);
      const allMessages = response.messages || [];

      // Transform messages to the expected format
      const transformedMessages = allMessages.map((msg, index) => ({
        id: msg.message_id || `msg-${index}`,
        message_id: msg.message_id,
        content: msg.prompt || msg.response || '',
        role: msg.prompt ? 'user' : 'assistant',
        timestamp: new Date().toISOString()
      }));

      // Always store data and navigate, even if empty
      localStorage.setItem('loadedChatHistory', JSON.stringify(transformedMessages));
      localStorage.setItem('loadedConversationId', conversationId);
      
      navigate("/chat");
    } catch (error) {
      console.error('Failed to load chat history:', error);
      toast({
        title: "Error",
        description: "Failed to load conversation. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateReportName = async (conversationId: string, newName: string) => {
    try {
      await saveReportMutation.mutateAsync({
        report_id: conversationId as UUID,
        name: newName,
        description: "Updated report name"
      });
    } catch (error) {
      console.error('Failed to update report name:', error);
    }
  };

  const filteredReports = reports.filter(report =>
    (report.reportName?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
    report.defaultTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const featureCards = [
    {
      icon: DollarSign,
      title: "Payroll Insights",
      description: "Get total costs, averages, and breakdowns by department",
      example: "Show me total payroll costs for Q3 2024"
    },
    {
      icon: Users,
      title: "Workforce Reports", 
      description: "Analyze individual employee data and metrics",
      example: "List all employees with overtime hours last month"
    },
    {
      icon: TrendingUp,
      title: "Trend Analysis",
      description: "Compare periods and identify changes over time", 
      example: "Compare payroll costs between Q2 and Q3 2024"
    }
  ];

  const promptingTips = [
    "Be specific with time ranges: \"Q3 2024\", \"last month\", \"year-to-date\"",
    "Filter by departments: \"Engineering team\", \"Sales department\"", 
    "Include pay codes: \"overtime\", \"bonuses\", \"healthcare deductions\"",
    "Ask for comparisons: \"compare this quarter to last quarter\""
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="max-w-3xl mx-auto mb-8">
            <h1 className="text-3xl font-medium text-gray-900 mb-4">
              Transform payroll data into insights with AI
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              Ask simple questions, get detailed reports. Analyze your payroll history, earnings & deductions, employee profiles, and more.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600 mb-8">
              <div className="flex items-center justify-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                </div>
                <span>Payroll Insights</span>
              </div>
              <div className="flex items-center justify-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <span>Workforce Reports</span>
              </div>
              <div className="flex items-center justify-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                <span>Trend Analysis</span>
              </div>
            </div>
          </div>
        </div>
          
        {/* Chat Input */}
        <div className="max-w-2xl mx-auto">
          <Card className="p-1 shadow-lg border-blue-200">
            <div className="flex items-center gap-3 p-3">
              <div className="flex-1">
                <Input
                  placeholder="Ask for a custom payroll report"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleChatRedirect()}
                  className="border-0 bg-transparent text-base placeholder:text-muted-foreground focus-visible:ring-0 px-0"
                />
              </div>
              <Button 
                size="sm" 
                className="bg-primary hover:bg-primary/90" 
                onClick={handleChatRedirect}
                disabled={isStartingChat || !chatInput.trim()}
              >
                {isStartingChat ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-2 pb-8">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Recent Reports Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-6 h-6 text-muted-foreground" />
              <h2 className="text-xl font-medium text-muted-foreground">Recent Reports</h2>
            </div>
            <Separator />
          </div>

          {/* Search */}
          <div className="relative mb-6 w-full md:max-w-[calc(50%-0.75rem)]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Reports Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="p-6 h-64">
                  <div className="flex flex-col h-full justify-between animate-pulse">
                    <div>
                      <div className="h-6 bg-muted rounded mb-2 w-3/4"></div>
                      <div className="h-3 bg-muted rounded mb-3 w-1/2"></div>
                      <div className="space-y-2">
                        <div className="h-3 bg-muted rounded w-full"></div>
                        <div className="h-3 bg-muted rounded w-5/6"></div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-10 bg-muted rounded flex-1"></div>
                      <div className="h-10 bg-muted rounded flex-1"></div>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              filteredReports.slice(0, 6).map((report) => (
                <Card key={report.conversationId} className="p-6 hover:shadow-lg transition-smooth hover:border-blue-500 hover:border-2 cursor-pointer h-64">
                  <div className="flex flex-col h-full justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground text-lg mb-2">
                        {report.reportName || "Untitled Report - Click to edit"}
                      </h3>
                      <div className="text-xs text-muted-foreground mb-3">
                        Created on {new Date(report.createdAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: '2-digit', 
                          day: '2-digit' 
                        })}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {report.defaultTitle}
                      </p>
                    </div>

                    <div className="flex gap-2 justify-center">
                      <Button 
                        variant="outline" 
                        size="default" 
                        className="flex-1"
                        onClick={() => {
                          if (report.reportName) {
                            handleEditReport(report.conversationId);
                          } else {
                            const newName = prompt('Enter new report name:', report.reportName || '');
                            if (newName && newName.trim()) {
                              handleUpdateReportName(report.conversationId, newName.trim());
                            }
                          }
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        {report.reportName ? 'Edit report' : 'Set name'}
                      </Button>
                      <Button 
                        size="default" 
                        className="bg-primary hover:bg-primary/90 flex-1"
                        onClick={() => handleEditReport(report.conversationId)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Run report
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {filteredReports.length === 0 && (
            <Card className="p-12 text-center">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-accent-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">No reports found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'Try adjusting your search criteria' : 'Create your first report to get started'}
              </p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create New Report
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* Save Report Dialog - Always render to ensure it's in DOM */}
      <SaveReportDialog
        open={saveDialogOpen && !!currentReportId}
        onOpenChange={setSaveDialogOpen}
        reportId={currentReportId || ''}
        initialPrompt={currentPrompt}
      />
    </div>
  );
};

export default Dashboard;
