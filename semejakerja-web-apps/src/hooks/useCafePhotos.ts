import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

export interface CafePhotoAsset {
  id: string;
  url: string;
  caption: string | null;
}

// Photos live in a separate table (admin uploads + approved community
// contributions) rather than on the cafe row itself, so this is fetched
// per-cafe only when its modal is actually open — not baked into useCafes,
// which would mean joining photos for all ~400 cafes on every map load.
export function useCafePhotos(cafeId: string) {
  return useQuery({
    queryKey: ['cafe-photos', cafeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cafe_photos')
        .select('id, storage_path, caption')
        .eq('cafe_id', cafeId)
        .eq('status', 'approved')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);

      return (data ?? []).map((row): CafePhotoAsset => ({
        id: row.id,
        caption: row.caption,
        url: supabase.storage.from('cafe-photos').getPublicUrl(row.storage_path).data.publicUrl,
      }));
    },
    staleTime: 2 * 60 * 1000,
  });
}
