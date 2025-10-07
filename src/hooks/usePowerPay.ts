// usePowerPay.ts
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  PowerPayApi,
  PowerPayApiOptions,
  SaveReportRequest,
  ConversationRequest,
  UUID,
  ConversationResponse,
  ReportResponse,
  ReportDataResponse,
} from "@/lib/powerpay-api";
import { PowerPayApi as PowerPayApiClient } from "@/lib/powerpay-api";

// Factory hook to get a singleton-ish client per options
export function usePowerPayClient(opts?: PowerPayApiOptions) {
  return useMemo(() => new PowerPayApiClient(opts), [opts?.baseUrl, opts?.getToken, opts?.fetchFn, opts?.onUnauthorized]);
}

// Queries
export const useReports = (client: PowerPayApi) =>
  useQuery<ReportResponse[], Error>({
    queryKey: ["reports"],
    queryFn: () => client.getReports(),
  });

export const useConversationMessages = (client: PowerPayApi, reportId?: UUID, enabled = !!reportId) =>
  useQuery<ConversationResponse, Error>({
    queryKey: ["conversation", reportId, "messages"],
    queryFn: () => client.getConversationMessages(reportId!),
    enabled,
  });

export const useReportData = (client: PowerPayApi, reportId?: UUID, messageId?: UUID, enabled = !!(reportId && messageId)) =>
  useQuery<ReportDataResponse, Error>({
    queryKey: ["conversation", reportId, "messages", messageId, "data"],
    queryFn: () => client.getReportData(reportId!, messageId!),
    enabled,
  });

// Mutations
export const useSaveReport = (client: PowerPayApi) => {
  const qc = useQueryClient();
  return useMutation<ReportResponse, Error, SaveReportRequest>({
    mutationFn: (payload) => client.saveReport(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
  });
};

export const useStartConversation = (client: PowerPayApi, reportIdForRefetch?: UUID) => {
  const qc = useQueryClient();
  return useMutation<ConversationResponse, Error, ConversationRequest>({
    mutationFn: (payload) => client.startConversation(payload),
    onSuccess: (data) => {
      // Optionally refetch messages for returned reportId
      const id = data.reportId ?? reportIdForRefetch;
      if (id) {
        qc.invalidateQueries({ queryKey: ["conversation", id, "messages"] });
      }
    },
  });
};

export const useContinueConversation = (client: PowerPayApi, reportId: UUID) => {
  const qc = useQueryClient();
  return useMutation<ConversationResponse, Error, ConversationRequest>({
    mutationFn: (payload) => client.continueConversation(reportId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversation", reportId, "messages"] });
    },
  });
};
