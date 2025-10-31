import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Eye, Share2, Loader2, Lightbulb, Info, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useReports } from "@/contexts/ReportContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

const renderReportContent = (content: string) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentTableLines: string[] = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line is a table header (contains |)
    if (line.includes('|') && line.trim()) {
      if (!inTable) {
        inTable = true;
        currentTableLines = [];
      }
      currentTableLines.push(line);
    } else {
      // If we were in a table and now we're not, render the table
      if (inTable && currentTableLines.length > 0) {
        elements.push(renderTable(currentTableLines, elements.length));
        currentTableLines = [];
        inTable = false;
      }
      
      // Render non-table content
      if (line.trim()) {
        if (line.startsWith('# ')) {
          elements.push(<h1 key={elements.length} className="text-2xl font-bold mt-6 mb-4">{line.substring(2)}</h1>);
        } else if (line.startsWith('## ')) {
          elements.push(<h2 key={elements.length} className="text-xl font-semibold mt-5 mb-3">{line.substring(3)}</h2>);
        } else if (line.startsWith('- ')) {
          elements.push(<li key={elements.length} className="ml-4">{line.substring(2)}</li>);
        } else if (/^\d+\./.test(line)) {
          elements.push(<li key={elements.length} className="ml-4 list-decimal">{line.replace(/^\d+\.\s*/, '')}</li>);
        } else {
          elements.push(<p key={elements.length} className="mb-3">{line}</p>);
        }
      } else {
        elements.push(<br key={elements.length} />);
      }
    }
  }
  
  // Handle table at the end
  if (inTable && currentTableLines.length > 0) {
    elements.push(renderTable(currentTableLines, elements.length));
  }
  
  return elements;
};

const renderTable = (tableLines: string[], key: number) => {
  if (tableLines.length < 2) return null;
  
  const headers = tableLines[0].split('|').map(h => h.trim()).filter(h => h);
  const rows = tableLines.slice(2).map(line => 
    line.split('|').map(cell => cell.trim()).filter(cell => cell)
  );
  
  return (
    <div key={key} className="my-6 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header, i) => (
              <TableHead key={i} className="font-semibold">
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              {row.map((cell, j) => (
                <TableCell key={j}>
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const renderApiDataTable = (apiData: { title: string; type: string; data: Record<string, any>[] | string[][] }) => {
  if (!apiData.data || apiData.data.length === 0) return null;
  
  // Check if data is array of arrays (tabular format from chat)
  if (Array.isArray(apiData.data[0])) {
    const tableData = apiData.data as string[][];
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {tableData[0]?.map((header, i) => (
                <TableHead key={i} className="font-semibold">
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.slice(1).map((row, i) => (
              <TableRow key={i}>
                {row.map((cell, j) => (
                  <TableCell key={j} className="text-sm">
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
  
  // Original object-based format
  const headers = Object.keys(apiData.data[0]);
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            {headers.map((header, i) => (
              <th key={i} className="text-left py-3 px-4 font-semibold text-gray-900 text-sm">
                {header.replace(/([A-Z])/g, ' $1').trim()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {apiData.data.slice(0, 7).map((row, i) => (
            <tr key={i} className="border-b border-gray-100">
              {headers.map((header, j) => (
                <td key={j} className="py-3 px-4 text-sm text-gray-700">
                  {typeof row[header] === 'number' && header.toLowerCase().includes('pay') || 
                   typeof row[header] === 'number' && header.toLowerCase().includes('deduction') ||
                   typeof row[header] === 'number' && header.toLowerCase().includes('contribution') ? 
                    `$${row[header].toLocaleString()}` : row[header]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const exportToCSV = (report: any) => {
  if (!report) return;

  let csvContent = '';
  let filename = `${report.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;

  // If we have API data, export that as CSV
  if (report.apiData && report.apiData.data && report.apiData.data.length > 0) {
    const headers = Object.keys(report.apiData.data[0]);
    csvContent = headers.join(',') + '\n';
    
    report.apiData.data.forEach((row: Record<string, any>) => {
      const values = headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvContent += values.join(',') + '\n';
    });
  } else {
    // Fallback: export basic report info as CSV
    csvContent = 'Field,Value\n';
    csvContent += `Title,"${report.title}"\n`;
    csvContent += `Type,"${report.type}"\n`;
    csvContent += `Created At,"${report.createdAt.toLocaleDateString()}"\n`;
    csvContent += `Description,"${report.description}"\n`;
  }

  // Create and download the file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const ReportPreview = () => {
  const { currentReport } = useReports();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isComprehensiveOpen, setIsComprehensiveOpen] = useState(false);
  
  // Debug logging
  console.log('ReportPreview currentReport:', currentReport);

  const handleExport = async () => {
    if (!currentReport) {
      toast({
        title: "No Report Available",
        description: "Please generate a report first before exporting.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      // Simulate export processing
      await new Promise(resolve => setTimeout(resolve, 500));
      exportToCSV(currentReport);
      toast({
        title: "Export Successful",
        description: "Report has been downloaded as CSV file.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting the report.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-card/50 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground">Report Preview</h2>
          <p className="text-sm text-muted-foreground">Live preview of your generated report</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button size="sm" onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {currentReport ? (
            <div className="bg-white p-8 rounded-lg shadow-sm border">
              {/* Report Header */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  {currentReport.title}
                </h1>
                <p className="text-sm text-gray-500 mb-4">
                  Generated on {currentReport.createdAt.toLocaleDateString()}
                </p>
                {currentReport.apiData && (
                  <p className="text-sm text-gray-600">
                    Showing {Math.min(currentReport.apiData.data?.length || 0, 7)} of {currentReport.apiData.data?.length || 0} rows. <span className="text-blue-600 cursor-pointer hover:underline">Export for full report.</span>
                  </p>
                )}
              </div>

              {/* Report Content */}
              {currentReport.apiData ? (
                <div className="space-y-6">
                  {/* Summary Section - Enhanced */}
                  {currentReport.summary && (
                    <Card className="p-6 bg-gradient-to-br from-primary/5 via-primary/3 to-background border-primary/20 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                          <Info className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-foreground mb-2">Summary</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{currentReport.summary}</p>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Key Insights Section - Enhanced */}
                  {currentReport.keyInsights && currentReport.keyInsights.length > 0 && (
                    <Card className="p-6 bg-gradient-to-br from-amber-50 via-amber-50/50 to-background border-amber-200 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                          <Lightbulb className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-amber-900 mb-3">Key Insights</h3>
                          <ul className="space-y-2.5">
                            {currentReport.keyInsights.map((insight, idx) => (
                              <li key={idx} className="flex items-start gap-3 text-sm text-amber-800">
                                <div className="w-5 h-5 bg-amber-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-xs font-semibold text-amber-700">{idx + 1}</span>
                                </div>
                                <span className="leading-relaxed">{insight}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Suggested Prompts Section - New */}
                  {currentReport.suggestedPrompts && currentReport.suggestedPrompts.length > 0 && (
                    <Card className="p-6 bg-gradient-to-br from-violet-50 via-violet-50/50 to-background border-violet-200 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                          <Sparkles className="w-5 h-5 text-violet-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-violet-900 mb-3">Suggested Next Steps</h3>
                          <div className="flex flex-wrap gap-2">
                            {currentReport.suggestedPrompts.map((prompt, idx) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="px-3 py-1.5 bg-violet-100 hover:bg-violet-200 text-violet-700 border-violet-300 cursor-default transition-colors text-xs"
                              >
                                {prompt}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Comprehensive Information - Collapsible */}
                  {currentReport.comprehensiveInfo && (
                    <Collapsible open={isComprehensiveOpen} onOpenChange={setIsComprehensiveOpen}>
                      <Card className="p-5 border-border shadow-sm hover:shadow transition-shadow">
                        <CollapsibleTrigger asChild>
                          <button className="flex items-center justify-between w-full text-left group">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                                <Eye className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                Comprehensive Information
                              </h3>
                            </div>
                            {isComprehensiveOpen ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            )}
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-4">
                          <p className="text-sm text-muted-foreground leading-relaxed pl-11">{currentReport.comprehensiveInfo}</p>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  )}

                  {/* Data Table */}
                  {renderApiDataTable(currentReport.apiData)}
                  
                  {/* Download Section */}
                  <div className="border-t pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-base font-medium text-gray-900 mb-1">
                          Ready to download the full report?
                        </p>
                        <p className="text-sm text-blue-600">
                          Export all {currentReport.apiData.data?.length || 0} rows to .xls format
                        </p>
                      </div>
                      <Button 
                        onClick={handleExport}
                        disabled={isExporting}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
                      >
                        {isExporting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        {isExporting ? 'Downloading...' : 'Download'}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                  {renderReportContent(currentReport.content)}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center">
                <h2 className="text-lg font-medium text-muted-foreground">
                  No Preview Available
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Generate a report to see the preview here
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};