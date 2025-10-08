import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePowerPayClient, useSaveReport } from "@/hooks/usePowerPay";
import { UUID } from "@/lib/powerpay-api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SaveReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: UUID;
  initialPrompt: string;
}

export function SaveReportDialog({ 
  open, 
  onOpenChange, 
  reportId,
  initialPrompt 
}: SaveReportDialogProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const powerPayClient = usePowerPayClient({ 
    baseUrl: import.meta.env.VITE_POWERPAY_API_URL || 'http://localhost:8383',
    token: import.meta.env.VITE_POWERPAY_BEARER_TOKEN
  });
  const saveReportMutation = useSaveReport(powerPayClient);

  const [name, setName] = useState(
    initialPrompt.length > 50 ? initialPrompt.substring(0, 50) + "..." : initialPrompt
  );
  const [description, setDescription] = useState(initialPrompt);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Report name is required",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      await saveReportMutation.mutateAsync({
        report_id: reportId,
        name: name.trim(),
        description: description.trim()
      });

      toast({
        title: "Success",
        description: "Report saved successfully"
      });

      // Store the conversation ID and navigate to chat
      localStorage.setItem('loadedConversationId', reportId);
      onOpenChange(false);
      navigate("/");
    } catch (error) {
      console.error('Failed to save report:', error);
      toast({
        title: "Error",
        description: "Failed to save report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Save Report</DialogTitle>
          <DialogDescription>
            Enter a name and description for your new report
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">
              Report Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter report name"
              disabled={isSaving}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter report description"
              rows={4}
              disabled={isSaving}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !name.trim()}
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
