// Simple test hook to verify React Query integration
import { useQuery } from "@tanstack/react-query";

export const useReactQueryTest = () => {
  return useQuery({
    queryKey: ["react-query-test"],
    queryFn: async () => {
      // Simple test query that returns a success message
      return Promise.resolve({
        message: "React Query is successfully integrated!",
        timestamp: new Date().toISOString(),
      });
    },
    staleTime: 1000 * 60, // 1 minute
  });
};

// You can test this hook in any component by importing and using:
// const { data, isLoading, error } = useReactQueryTest()
// console.log('React Query Test:', { data, isLoading, error })
