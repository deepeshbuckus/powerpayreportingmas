import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePowerPayClient } from '@/hooks/usePowerPay';
import type { UUID } from '@/lib/powerpay-api';

export interface Report {
  id: string;
  title: string;
  description: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'published' | 'archived';
  type: string;
  attachmentId?: string;
  apiData?: {
    title: string;
    type: string;
    data: Record<string, any>[];
  };
}

interface ReportContextType {
  reports: Report[];
  currentReport: Report | null;
  messageId: string | null;
  conversationId: string | null;
  attachmentId: string | null;
  addReport: (report: Omit<Report, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateReport: (id: string, updates: Partial<Report>) => void;
  setCurrentReport: (report: Report | null) => void;
  generateReportFromPrompt: (prompt: string, apiData?: { title: string; type: string; data: Record<string, any>[] }) => Promise<Report>;
  startNewChat: (content: string) => Promise<{ messageId: string; conversationId: string }>;
  setSessionData: (messageId: string, conversationId: string) => void;
  setMessageId: (messageId: string) => void;
  setAttachmentId: (attachmentId: string) => void;
  fetchAttachmentResult: (conversationId: string, messageId: string, attachmentId: string) => Promise<void>;
  sendChatMessage: (conversationId: string, content: string) => Promise<void>;
  fetchConversationMessages: (conversationId: string) => Promise<void>;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export const useReports = () => {
  const context = useContext(ReportContext);
  if (!context) {
    throw new Error('useReports must be used within a ReportProvider');
  }
  return context;
};

// Mock data for initial reports
const initialReports: Report[] = [
  {
    id: '1',
    title: 'Q4 Payroll Summary Report',
    description: 'Comprehensive quarterly payroll analysis including salary distributions, overtime costs, and tax withholdings.',
    content: 'Sample payroll content...',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-18'),
    status: 'published',
    type: 'Payroll'
  },
  {
    id: '2',
    title: 'Employee Benefits Analysis',
    description: 'Detailed breakdown of healthcare, retirement contributions, and other employee benefits costs.',
    content: 'Sample benefits content...',
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-16'),
    status: 'draft',
    type: 'Benefits'
  },
  {
    id: '3',
    title: 'Monthly Attendance Report',
    description: 'Analysis of employee attendance patterns, PTO usage, and overtime trends across departments.',
    content: 'Sample attendance content...',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-14'),
    status: 'published',
    type: 'Attendance'
  },
  {
    id: '4',
    title: 'Workforce Demographics Study',
    description: 'Comprehensive demographic analysis including diversity metrics, age distribution, and tenure statistics.',
    content: 'Sample demographics content...',
    createdAt: new Date('2024-01-08'),
    updatedAt: new Date('2024-01-12'),
    status: 'published',
    type: 'Demographics'
  },
  {
    id: '5',
    title: 'Compensation Benchmarking Report',
    description: 'Market comparison of salary ranges, bonus structures, and total compensation packages.',
    content: 'Sample compensation content...',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-09'),
    status: 'draft',
    type: 'Payroll'
  },
  {
    id: '6',
    title: 'Performance Review Analytics',
    description: 'Statistical analysis of performance ratings, goal completion rates, and promotion trends.',
    content: 'Sample performance content...',
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-07'),
    status: 'published',
    type: 'Performance'
  }
];

export const ReportProvider = ({ children }: { children: ReactNode }) => {
  const token = import.meta.env.VITE_POWERPAY_BEARER_TOKEN;
  const baseUrl = import.meta.env.VITE_POWERPAY_API_URL;
  
  const powerPayClient = usePowerPayClient({ 
    baseUrl,
    token
  });
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [messageId, setMessageId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [attachmentId, setAttachmentId] = useState<string | null>(null);

  // Check for loaded conversation ID on mount
  useEffect(() => {
    const loadedConversationId = localStorage.getItem('loadedConversationId');
    if (loadedConversationId) {
      setConversationId(loadedConversationId);
      // Find the report with this conversation ID and set it as current
      const matchingReport = reports.find(report => report.id === loadedConversationId);
      if (matchingReport) {
        setCurrentReport(matchingReport);
      }
    }
  }, [reports]);

  const addReport = (reportData: Omit<Report, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newReport: Report = {
      ...reportData,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setReports(prev => [newReport, ...prev]);
    setCurrentReport(newReport);
  };

  const updateReport = (id: string, updates: Partial<Report>) => {
    setReports(prev => prev.map(report => 
      report.id === id 
        ? { ...report, ...updates, updatedAt: new Date() }
        : report
    ));
    
    if (currentReport?.id === id) {
      setCurrentReport(prev => prev ? { ...prev, ...updates, updatedAt: new Date() } : null);
    }
  };

  const generateReportFromPrompt = async (prompt: string, apiData?: { title: string; type: string; data: Record<string, any>[] }): Promise<Report> => {
    try {
      // Use startNewChat to initiate a new conversation
      const { messageId, conversationId } = await startNewChat(prompt);
      
      // Return the current report that was created by startNewChat
      if (currentReport) {
        return currentReport;
      }
      
      // Fallback: create a basic report if no data was returned
      const newReport: Report = {
        id: Date.now().toString(),
        title: 'AI Generated Report',
        description: `Report generated from prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`,
        content: generateMockReportContent(prompt, 'General'),
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'draft',
        type: 'General',
        attachmentId: undefined
      };

      setReports(prev => [newReport, ...prev]);
      setCurrentReport(newReport);
      return newReport;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  };

  const startNewChat = async (content: string): Promise<{ messageId: string; conversationId: string }> => {
    try {
      const response = await powerPayClient.startConversation({ prompt: content });
      
      const reportId = response.report_id || '';
      const lastMessage = response.messages?.[response.messages.length - 1];
      const msgId = lastMessage?.message_id || '';
      
      setMessageId(msgId);
      setConversationId(reportId);

      // Store the conversation in localStorage so ChatInterface can pick it up
      if (response.messages && response.messages.length > 0) {
        const transformedMessages = response.messages.map((msg, index) => ({
          id: msg.message_id || `msg-${index}`,
          message_id: msg.message_id,
          content: msg.prompt || '',
          role: msg.role || (msg.prompt ? 'user' : 'assistant'),
          prompt: msg.prompt,
          response: Array.isArray(msg.response) ? msg.response : null,
          tableData: Array.isArray(msg.response) ? msg.response : null,
          timestamp: new Date().toISOString()
        }));
        
        localStorage.setItem('loadedChatHistory', JSON.stringify(transformedMessages));
        localStorage.setItem('loadedConversationId', reportId);
      }

      // Create a basic report from the conversation
      const newReport: Omit<Report, 'id' | 'createdAt' | 'updatedAt'> = {
        title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
        description: `Report generated from prompt: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`,
        content: generateMockReportContent(content, 'General'),
        status: 'draft',
        type: 'General',
      };

      addReport(newReport);
      return { messageId: msgId, conversationId: reportId };
    } catch (error) {
      console.error('Error starting new chat:', error);
      throw error;
    }
  };

  const setSessionData = (messageId: string, conversationId: string) => {
    setMessageId(messageId);
    setConversationId(conversationId);
  };


  const fetchAttachmentResult = async (conversationId: string, messageId: string, attachmentId: string): Promise<void> => {
    try {
      console.log('Fetching attachment result:', { conversationId, messageId, attachmentId });
      
      const response = await powerPayClient.getReportData(conversationId as UUID, messageId as UUID);
      console.log('Report data response:', response);
      
      if (!response.data || response.data.length === 0) {
        console.log('No data in response');
        return;
      }

      // Transform 2D array to objects
      const transformedData = response.data.slice(1).map((row: any[]) => {
        const obj: Record<string, any> = {};
        response.data![0].forEach((header: string, index: number) => {
          obj[header] = row[index];
        });
        return obj;
      });

      const apiData = {
        title: 'Query Results',
        type: 'Query Results',
        data: transformedData
      };

      console.log('Transformed API data:', apiData);

      // Update current report with the fetched data
      if (currentReport) {
        console.log('Updating current report with attachment data');
        const updatedReport = {
          ...currentReport,
          apiData: apiData,
          content: generateContentFromApiData(apiData, currentReport.description)
        };
        setCurrentReport(updatedReport);
        updateReport(currentReport.id, { apiData: apiData, content: updatedReport.content });
      } else {
        console.log('No current report found to update, creating new report');
        const newReport: Report = {
          id: Date.now().toString(),
          title: apiData.title,
          description: 'Report generated from chat history',
          content: generateContentFromApiData(apiData, 'Data Report'),
          status: 'published',
          type: 'data-report',
          createdAt: new Date(),
          updatedAt: new Date(),
          apiData: apiData
        };
        console.log('Created new report:', newReport);
        setCurrentReport(newReport);
        addReport(newReport);
      }
    } catch (error) {
      console.error('Error fetching attachment result:', error);
      throw error;
    }
  };

  const sendChatMessage = async (conversationId: string, content: string): Promise<void> => {
    try {
      const response = await powerPayClient.continueConversation(conversationId as UUID, { prompt: content });
      
      if (!response || !response.messages || response.messages.length === 0) {
        throw new Error('Invalid response format from API');
      }

      console.log('Continue conversation response:', response);

      // Get the latest message (index 0 based on API response)
      const latestMessage = response.messages[0];
      
      if (latestMessage) {
        // Update message ID and conversation ID
        const newMessageId = latestMessage.message_id;
        if (newMessageId) {
          setMessageId(newMessageId);
          setSessionData(newMessageId, conversationId);
        }

        // If the latest message has table data (response array), update the preview
        if (latestMessage.response && Array.isArray(latestMessage.response)) {
          const updatedReport = {
            id: conversationId,
            title: 'Query Results',
            description: `Report generated from prompt: "${content}"`,
            content: '',
            status: 'published' as const,
            type: 'data-report',
            createdAt: currentReport?.createdAt || new Date(),
            updatedAt: new Date(),
            apiData: {
              title: 'Query Results',
              type: 'Query Results',
              data: latestMessage.response
            }
          };
          setCurrentReport(updatedReport);
          
          if (currentReport?.id) {
            updateReport(currentReport.id, { 
              apiData: updatedReport.apiData,
              updatedAt: new Date()
            });
          }
        }

        // Store the latest message for ChatInterface to pick up
        const messageForChat = {
          id: latestMessage.message_id || `msg-${Date.now()}`,
          message_id: latestMessage.message_id,
          content: latestMessage.prompt || '',
          sender: 'assistant',
          role: 'assistant',
          prompt: latestMessage.prompt,
          response: Array.isArray(latestMessage.response) ? latestMessage.response : null,
          tableData: Array.isArray(latestMessage.response) ? latestMessage.response : null,
          timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('latestChatMessage', JSON.stringify(messageForChat));
      }
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }
  };

  const fetchConversationMessages = async (conversationId: string): Promise<void> => {
    try {
      const response = await powerPayClient.getConversationMessages(conversationId as UUID);
      
      const messages = response.messages || [];
      
      // For each message, we could fetch data if needed
      for (const message of messages) {
        if (message.message_id) {
          console.log('Message:', message);
        }
      }
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      throw error;
    }
  };

  return (
    <ReportContext.Provider value={{
      reports,
      currentReport,
      messageId,
      conversationId,
      attachmentId,
      addReport,
      updateReport,
      setCurrentReport,
      generateReportFromPrompt,
      startNewChat,
      setSessionData,
      setMessageId,
      setAttachmentId,
      fetchAttachmentResult,
      sendChatMessage,
      fetchConversationMessages
    }}>
      {children}
    </ReportContext.Provider>
  );
};

const transformApiResponse = (statementResponse: any, prompt: string) => {
  const columns = statementResponse.manifest.schema.columns;
  const dataArray = statementResponse.result.data_array;
  
  // Transform data array into objects
  const data = dataArray.map((row: any[]) => {
    const obj: Record<string, any> = {};
    columns.forEach((col: any, index: number) => {
      obj[col.name] = row[index];
    });
    return obj;
  });

  return {
    title: `Query Results: ${prompt.substring(0, 50)}...`,
    type: 'Query Results',
    data: data
  };
};

const createReportFromApiData = (prompt: string, apiData: { title: string; type: string; data: Record<string, any>[] }, attachmentId?: string): Omit<Report, 'id' | 'createdAt' | 'updatedAt'> => {
  return {
    title: apiData.title,
    description: `Report generated from prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`,
    content: generateContentFromApiData(apiData, prompt),
    status: 'draft',
    type: apiData.type,
    attachmentId: attachmentId,
    apiData: apiData
  };
};

const generateContentFromApiData = (apiData: { title: string; type: string; data: Record<string, any>[] }, prompt: string): string => {
  return `
# ${apiData.title}

## Executive Summary
Based on your request: "${prompt}"

This report provides detailed insights from the provided data.

## Key Findings
- Total records analyzed: ${apiData.data.length}
- Data type: ${apiData.type}
- Generated insights based on the data patterns

## Data Analysis
The following table shows the complete dataset:

${generateTableFromApiData(apiData.data)}
  `;
};

const generateTableFromApiData = (data: Record<string, any>[]): string => {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const headerRow = `| ${headers.join(' | ')} |`;
  const separatorRow = `|${headers.map(() => '----------').join('|')}|`;
  const dataRows = data.map(row => `| ${headers.map(header => row[header] || '').join(' | ')} |`);
  
  return [headerRow, separatorRow, ...dataRows].join('\n');
};

const generateMockReportContent = (prompt: string, type: string): string => {
  const tableData = generateTableData(type);
  
  return `
# ${type} Report Analysis

## Executive Summary
Based on your request: "${prompt}"

This comprehensive ${type.toLowerCase()} report provides detailed insights and analysis tailored to your specific requirements.

## Key Metrics Table
${tableData}

## Key Findings
- **Performance Metrics**: Analysis shows positive trends across key indicators
- **Cost Analysis**: Detailed breakdown of expenses and optimization opportunities
- **Compliance Status**: All regulatory requirements are being met

## Detailed Analysis
The data indicates strong performance in several areas, with opportunities for optimization in others. Key metrics show:

- 15% improvement in efficiency
- Cost savings of $25,000 annually
- 98% compliance rate
- Employee satisfaction increased by 12%

## Conclusion
The analysis demonstrates positive outcomes based on the data provided.
  `;
};

const generateTableData = (type: string): string => {
  switch (type) {
    case 'Payroll':
      return `| Department | Employee Count | Average Salary | Total Cost | Overtime Hours |
|------------|----------------|----------------|------------|----------------|
| Engineering | 45 | $95,000 | $4,275,000 | 1,250 |
| Sales | 32 | $75,000 | $2,400,000 | 890 |
| Marketing | 18 | $70,000 | $1,260,000 | 320 |
| HR | 12 | $65,000 | $780,000 | 150 |
| Finance | 15 | $80,000 | $1,200,000 | 200 |`;

    case 'Benefits':
      return `| Benefit Type | Enrolled Employees | Monthly Cost per Employee | Total Annual Cost | Utilization Rate |
|--------------|-------------------|---------------------------|-------------------|------------------|
| Health Insurance | 110 | $650 | $858,000 | 95% |
| Dental Insurance | 95 | $120 | $136,800 | 85% |
| Vision Insurance | 88 | $45 | $47,520 | 80% |
| 401(k) Match | 102 | $320 | $391,680 | 92% |
| Life Insurance | 122 | $25 | $36,600 | 100% |`;

    case 'Attendance':
      return `| Employee ID | Department | Days Present | Days Absent | PTO Used | Sick Leave | Attendance Rate |
|-------------|------------|--------------|-------------|----------|------------|-----------------|
| EMP001 | Engineering | 220 | 10 | 15 | 5 | 95.7% |
| EMP002 | Sales | 225 | 5 | 12 | 3 | 97.8% |
| EMP003 | Marketing | 215 | 15 | 20 | 8 | 93.5% |
| EMP004 | HR | 230 | 0 | 10 | 0 | 100% |
| EMP005 | Finance | 218 | 12 | 18 | 6 | 94.8% |`;

    case 'Demographics':
      return `| Age Group | Count | Percentage | Gender Distribution | Department Distribution |
|-----------|-------|------------|-------------------|-------------------------|
| 22-30 | 35 | 28.7% | M: 18, F: 17 | Eng: 15, Sales: 12, Other: 8 |
| 31-40 | 45 | 36.9% | M: 25, F: 20 | Eng: 20, Sales: 10, Other: 15 |
| 41-50 | 30 | 24.6% | M: 16, F: 14 | Eng: 8, Sales: 8, Other: 14 |
| 51+ | 12 | 9.8% | M: 7, F: 5 | Eng: 2, Sales: 2, Other: 8 |`;

    default:
      return `| Metric | Q1 | Q2 | Q3 | Q4 | YoY Change |
|--------|----|----|----|----|------------|
| Revenue | $2.1M | $2.3M | $2.5M | $2.8M | +15% |
| Expenses | $1.8M | $1.9M | $2.0M | $2.1M | +8% |
| Profit | $300K | $400K | $500K | $700K | +35% |
| ROI | 12% | 15% | 18% | 22% | +10% |`;
  }
};