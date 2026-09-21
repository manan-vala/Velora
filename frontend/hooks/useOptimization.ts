import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAppStore } from "@/store/useAppStore";
import { startOptimizationJob, checkOptimizationStatus } from "@/lib/api";

export function useOptimization() {
  const parsedData = useAppStore((state) => state.parsedData);
  const uploadedFile = useAppStore((state) => state.uploadedFile);
  const optimizationTaskId = useAppStore((state) => state.optimizationTaskId);
  const optimizationStatus = useAppStore((state) => state.optimizationStatus);

  //ui edit
  const setLayer = useAppStore((state) => state.setLayer);

  const setOptimizationTaskId = useAppStore(
    (state) => state.setOptimizationTaskId,
  );
  const setOptimizationStatus = useAppStore(
    (state) => state.setOptimizationStatus,
  );
  const setOptimizationResult = useAppStore(
    (state) => state.setOptimizationResult,
  );

  const startJobMutation = useMutation({
    mutationFn: () => {
      if (!parsedData || !uploadedFile) {
        throw new Error("Missing data or file for optimization");
      }
      return startOptimizationJob(parsedData, uploadedFile);
    },
    onMutate: () => {
      console.log("[Optimization] Starting optimization job...");
      setOptimizationStatus("processing");
    },
    onSuccess: (taskId) => {
      console.log("[Optimization] Job started, received task ID:", taskId);
      setOptimizationTaskId(taskId);
      setLayer("routes", true);
    },
    onError: (error) => {
      console.error("Failed to start optimization", error);
      setOptimizationStatus("failed");
    },
  });

  const pollingQuery = useQuery({
    queryKey: ["optimizationPolling", optimizationTaskId],
    queryFn: () => checkOptimizationStatus(optimizationTaskId!),
    enabled: !!optimizationTaskId,
    refetchInterval: (query) => {
      const currentStatus = query.state.data?.status;
      if (currentStatus === "completed" || currentStatus === "failed") {
        return false;
      }
      return 15000; // Poll every 15 seconds
    },
  });

  useEffect(() => {
    if (!pollingQuery.data) return;

    console.log("[Optimization] Poll result:", pollingQuery.data);

    if (pollingQuery.data.status === "completed" && pollingQuery.data.result) {
      console.log(
        "[Optimization] ✅ Completed! Final result:",
        pollingQuery.data.result,
      );
      setOptimizationResult(pollingQuery.data.result as any);
      setOptimizationStatus("completed");
      setOptimizationTaskId(null);
    } else if (pollingQuery.data.status === "failed") {
      console.error("[Optimization] ❌ Failed!", pollingQuery.data);
      setOptimizationStatus("failed");
      setOptimizationTaskId(null);
    }
  }, [
    pollingQuery.data,
    setOptimizationResult,
    setOptimizationStatus,
    setOptimizationTaskId,
  ]);

  return {
    runOptimization: () => startJobMutation.mutate(),
    status: optimizationStatus,
    isStarting: startJobMutation.isPending,
  };
}
