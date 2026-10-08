import ReelsScreen from '@/components/reels/ReelsScreen';

// The page is only a client-side shell; the reel is fetched from Supabase
// after hydration. Keeping this route static avoids an unnecessary SSR
// request for every shared link on constrained Node hosting.
export const dynamic = 'force-static';

export default function SharedReelPage() {
  return <ReelsScreen />;
}
