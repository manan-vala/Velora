import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMobileStore } from "@/store/useMobileStore";
import { startOptimizationJob, checkOptimizationStatus } from "@/lib/api";

export function useMobileOptimization() {
  const parsedData = useMobileStore((state) => state.parsedData);
  const uploadedFile = useMobileStore((state) => state.uploadedFile);
  const optimizationTaskId = useMobileStore((state) => state.optimizationTaskId);
  const optimizationStatus = useMobileStore((state) => state.optimizationStatus);

  const setOptimizationTaskId = useMobileStore((state) => state.setOptimizationTaskId);
  const setOptimizationStatus = useMobileStore((state) => state.setOptimizationStatus);
  const setOptimizationResult = useMobileStore((state) => state.setOptimizationResult);
  const setLayer = useMobileStore((state) => state.setLayer); 

  const startJobMutation = useMutation({
    mutationFn: () => {
      if (!parsedData || !uploadedFile) {
        throw new Error("Missing data or file for optimization");
      }
      return startOptimizationJob(parsedData, uploadedFile);
    },
    onMutate: () => {
      console.log("[Mobile Optimization] Starting job...");
      setOptimizationStatus("processing");
    },
    onSuccess: (taskId) => {
      console.log("[Mobile Optimization] Job started, task ID:", taskId);
      setOptimizationTaskId(taskId);
    },
    onError: (error) => {
      console.error("[Mobile Optimization] Failed to start", error);
      setOptimizationStatus("failed");
    },
  });

  const pollingQuery = useQuery({
    queryKey: ["mobileOptimizationPolling", optimizationTaskId],
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

    if (pollingQuery.data.status === "completed" && pollingQuery.data.result) {
      console.log("[Mobile Optimization] ✅ Completed!");
      setOptimizationResult(pollingQuery.data.result);
      setOptimizationStatus("completed");
      setOptimizationTaskId(null);
      setLayer("routes", true); // Automatically turns on map lines!
    } else if (pollingQuery.data.status === "failed") {
      console.error("[Mobile Optimization] ❌ Failed!");
      setOptimizationStatus("failed");
      setOptimizationTaskId(null);
    }
  }, [
    pollingQuery.data,
    setOptimizationResult,
    setOptimizationStatus,
    setOptimizationTaskId,
    setLayer
  ]);

  return {
    runOptimization: () => startJobMutation.mutate(),
    status: optimizationStatus,
    isStarting: startJobMutation.isPending,
  };
}