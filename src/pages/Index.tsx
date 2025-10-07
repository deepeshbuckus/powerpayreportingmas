import { ChatInterface } from "@/components/ChatInterface";
import { ReportPreview } from "@/components/ReportPreview";

const Index = () => {
  return (
    <div className="flex h-[calc(100vh-3rem)]">
      {/* Chat Interface */}
      <div className="w-96 border-r bg-card/30 backdrop-blur">
        <ChatInterface />
      </div>
      
      {/* Report Preview */}
      <div className="flex-1 bg-background">
        <ReportPreview />
      </div>
    </div>
  );
};

export default Index;
