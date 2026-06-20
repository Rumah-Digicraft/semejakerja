import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data cafe dianggap segar selama 5 menit — tidak ada refetch selama ini.
      staleTime: 5 * 60 * 1000,
      // Cache dipertahankan 10 menit setelah semua komponen yang menggunakannya unmount.
      gcTime: 10 * 60 * 1000,
      // Refetch otomatis di background saat user kembali ke tab (data mungkin sudah stale).
      refetchOnWindowFocus: true,
      // Coba ulang 2x jika fetch gagal sebelum tampilkan error.
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10_000),
    },
  },
});
