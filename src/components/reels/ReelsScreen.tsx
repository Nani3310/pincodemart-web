'use client';

import { useCallback, useEffect, useRef, useState, type UIEvent } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { Heart, MessageCircle, Play, RotateCw, Share2, Volume2, VolumeX } from 'lucide-react';
import { BottomNav } from '@/components/ui/BottomNav';
import { Dialog } from '@/components/ui/Dialog';
import { supabase } from '@/lib/supabase';

type Reel = {
  id: string; shop_id: string; product_id: string | null; title: string; video_url: string;
  thumbnail_url: string | null; duration_seconds: number; views_count: number;
  likes_count: number; comments_count: number; shop_name: string; shop_logo_url: string | null;
  viewer_has_liked: boolean; created_at: string | null;
};
type Comment = { id: string; reel_id: string; body: string; author_name: string; created_at: string };
type ShopRelation = { name?: string; logo_url?: string | null } | { name?: string; logo_url?: string | null }[];

function normalizeReel(row: Partial<Reel> & { shops?: ShopRelation | null }): Reel {
  const shop = Array.isArray(row.shops) ? row.shops[0] : row.shops;
  return {
    id: row.id ?? '', shop_id: row.shop_id ?? '', product_id: row.product_id ?? null,
    title: row.title ?? 'Local reel', video_url: row.video_url ?? '', thumbnail_url: row.thumbnail_url ?? null,
    duration_seconds: Number(row.duration_seconds ?? 0), views_count: Number(row.views_count ?? 0),
    likes_count: Number(row.likes_count ?? 0), comments_count: Number(row.comments_count ?? 0),
    shop_name: row.shop_name ?? shop?.name ?? 'Local shop', shop_logo_url: row.shop_logo_url ?? shop?.logo_url ?? null,
    viewer_has_liked: Boolean(row.viewer_has_liked), created_at: row.created_at ?? null,
  };
}

async function loadReelPage(before?: Reel | null): Promise<Reel[]> {
  const { data, error } = await supabase.rpc('reels_feed_cursor', {
    p_before_created_at: before?.created_at ?? null, p_before_id: before?.id ?? null, p_limit: 20,
  });
  if (!error && data) return (data as Reel[]).map(normalizeReel).filter((item) => item.id && item.video_url);

  // Compatibility fallback for installations where the cursor RPC has not been deployed yet.
  let query = supabase.from('reels')
    .select('id,shop_id,product_id,title,video_url,thumbnail_url,duration_seconds,views_count,likes_count,comments_count,created_at,shops!inner(name,logo_url)')
    .eq('is_published', true).order('created_at', { ascending: false }).limit(20);
  if (before?.created_at) query = query.lt('created_at', before.created_at);
  const fallback = await query;
  if (fallback.error) throw fallback.error;
  return (fallback.data ?? []).map((row) => normalizeReel(row as never)).filter((item) => item.id && item.video_url);
}

async function loadSharedReel(id: string): Promise<Reel | null> {
  const { data, error } = await supabase.from('reels')
    .select('id,shop_id,product_id,title,video_url,thumbnail_url,duration_seconds,views_count,likes_count,comments_count,created_at,shops!inner(name,logo_url)')
    .eq('id', id).eq('is_published', true).maybeSingle();
  if (error) throw error;
  return data ? normalizeReel(data as never) : null;
}

function ReelCard({ reel, onLike, onComments, onView }: {
  reel: Reel; onLike: (reel: Reel) => void; onComments: (reel: Reel) => void; onView: (reelId: string) => void;
}) {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const card = useRef<HTMLElement>(null);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let viewTimer: number | undefined;
    const observer = new IntersectionObserver((entries) => {
      const player = video.current;
      if (!player) return;
      if (entries[0]?.isIntersecting) {
        player.play().then(() => setPaused(false)).catch(() => setPaused(true));
        window.clearTimeout(viewTimer);
        viewTimer = window.setTimeout(() => onView(reel.id), 2000);
      }
      else { window.clearTimeout(viewTimer); player.pause(); setPaused(true); }
    }, { threshold: 0.65 });
    if (card.current) observer.observe(card.current);
    return () => { window.clearTimeout(viewTimer); observer.disconnect(); };
  }, [onView, reel.id]);

  const togglePlay = () => {
    const player = video.current;
    if (!player) return;
    if (player.paused) player.play().then(() => setPaused(false)).catch(() => setError('Tap to retry playback.'));
    else { player.pause(); setPaused(true); }
  };

  const share = async () => {
    const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
    const hostOrigin = window.location.hostname.endsWith('pincodemart.in')
      ? 'https://pincodemart.in'
      : window.location.origin;
    const url = `${configuredOrigin || hostOrigin}/reel/${encodeURIComponent(reel.id)}`;
    const text = `Watch “${reel.title}” from ${reel.shop_name} on PinCodeMart\n${url}`;
    try {
      if (navigator.share) await navigator.share({ title: reel.title, text, url });
      else { await navigator.clipboard.writeText(text); setMessage('Reel link copied'); }
    } catch (shareError) {
      if (!(shareError instanceof DOMException && shareError.name === 'AbortError')) setMessage('Could not share this reel.');
    }
  };

  return <article className="reel-card" ref={card} data-reel-id={reel.id}>
    <video ref={video} src={reel.video_url} poster={reel.thumbnail_url ?? undefined} muted={muted} loop playsInline preload="none" onError={() => setError('This video could not be loaded.')} aria-label={reel.title} />
    <button className="reel-play-area" onClick={togglePlay} aria-label={paused ? 'Play reel' : 'Pause reel'}>{paused && !error && <Play />}</button>
    {error && <p className="reel-error" role="alert">{error}</p>}
    <div className="reel-actions">
      <button onClick={() => setMuted((value) => !value)} aria-label={muted ? 'Unmute' : 'Mute'}>{muted ? <VolumeX /> : <Volume2 />}</button>
      <button onClick={() => onLike(reel)} aria-label={reel.viewer_has_liked ? 'Unlike reel' : 'Like reel'} aria-pressed={reel.viewer_has_liked} className={reel.viewer_has_liked ? 'liked' : ''}><Heart fill={reel.viewer_has_liked ? 'currentColor' : 'none'} /><span>{reel.likes_count}</span></button>
      <button onClick={() => onComments(reel)} aria-label="View comments"><MessageCircle /><span>{reel.comments_count}</span></button>
      <button onClick={() => void share()} aria-label="Share reel"><Share2 /></button>
      {reel.product_id && <button onClick={() => router.push(`/product/${reel.product_id}`)} aria-label="View product">🛍️</button>}
    </div>
    <div className="reel-caption"><button onClick={() => router.push(`/shop/${reel.shop_id}`)} className="reel-shop-name">{reel.shop_name}</button><p>{reel.title}</p>{message && <span role="status">{message}</span>}</div>
  </article>;
}

export default function ReelsScreen({ initialReelId: initialReelIdProp }: { initialReelId?: string } = {}) {
  const params = useParams<{ id?: string }>();
  const pathname = usePathname();
  const router = useRouter();
  // The explicit prop is used by the shared `/reel/[id]` page. Keeping the
  // params fallback preserves the normal `/reels` feed and client navigation.
  const initialReelId = initialReelIdProp ?? (typeof params?.id === 'string' ? params.id : null);
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [commentsFor, setCommentsFor] = useState<Reel | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);
  const viewed = useRef(new Set<string>());
  const targetScrolled = useRef(false);

  const load = useCallback(async (append = false) => {
    if (append ? loadingMore || !hasMore : loading) return;
    if (append) setLoadingMore(true); else { setLoading(true); setError(''); }
    try {
      const rows = await loadReelPage(append ? reels[reels.length - 1] : null);
      setReels((current) => append ? [...current, ...rows.filter((row) => !current.some((item) => item.id === row.id))] : rows);
      setHasMore(rows.length === 20);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Could not load reels.'); }
    finally { if (append) setLoadingMore(false); else setLoading(false); }
  }, [hasMore, loading, loadingMore, reels]);

  useEffect(() => {
    let active = true;
    const start = async () => {
      setLoading(true);
      try {
        // A shared link only needs the requested reel for first paint. Loading
        // another 20 rows (and their video metadata) here made deep links
        // unnecessarily expensive on mobile and constrained hosting.
        if (initialReelId) {
          const shared = await loadSharedReel(initialReelId);
          if (!active) return;
          setReels(shared ? [shared] : []);
          setHasMore(Boolean(shared));
          if (!shared) setError('This reel is no longer available.');
          return;
        }

        const page = await loadReelPage();
        if (!active) return;
        setReels(page);
        setHasMore(page.length === 20);
      } catch (loadError) { if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load reels.'); }
      finally { if (active) setLoading(false); }
    };
    void start();
    return () => { active = false; };
  }, [initialReelId]);

  useEffect(() => {
    if (!initialReelId || targetScrolled.current || !reels.some((item) => item.id === initialReelId)) return;
    targetScrolled.current = true;
    window.setTimeout(() => document.querySelector(`[data-reel-id="${CSS.escape(initialReelId)}"]`)?.scrollIntoView({ block: 'start' }), 0);
  }, [initialReelId, reels]);

  const recordView = useCallback((id: string) => {
    if (viewed.current.has(id)) return;
    viewed.current.add(id);
    void supabase.rpc('record_reel_view', { p_reel_id: id });
    setReels((current) => current.map((item) => item.id === id ? { ...item, views_count: item.views_count + 1 } : item));
  }, []);

  const toggleLike = useCallback(async (reel: Reel) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push(`/auth/login?next=${encodeURIComponent(pathname)}`); return; }
    const { data, error: likeError } = await supabase.rpc('toggle_reel_like', { p_reel_id: reel.id });
    if (likeError) { setError(likeError.message); return; }
    const liked = Boolean(data);
    setReels((current) => current.map((item) => item.id === reel.id ? { ...item, viewer_has_liked: liked, likes_count: Math.max(0, item.likes_count + (liked ? 1 : -1)) } : item));
  }, [pathname, router]);

  const openComments = useCallback(async (reel: Reel) => {
    setCommentsFor(reel); setCommentsLoading(true);
    const { data, error: commentsError } = await supabase.rpc('reel_comments_page', { p_reel_id: reel.id, p_offset: 0, p_limit: 50 });
    setCommentsLoading(false);
    if (commentsError) setError(commentsError.message); else setComments((data ?? []) as Comment[]);
  }, []);

  const addComment = async () => {
    if (!commentsFor || !commentDraft.trim() || commentSaving) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push(`/auth/login?next=${encodeURIComponent(pathname)}`); return; }
    setCommentSaving(true);
    const { error: insertError } = await supabase.from('reel_comments').insert({ reel_id: commentsFor.id, user_id: user.id, body: commentDraft.trim().slice(0, 500) });
    setCommentSaving(false);
    if (insertError) { setError(insertError.message); return; }
    setCommentDraft(''); await openComments(commentsFor);
    setReels((current) => current.map((item) => item.id === commentsFor.id ? { ...item, comments_count: item.comments_count + 1 } : item));
  };

  const onFeedScroll = (event: UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < target.clientHeight * 2) void load(true);
  };

  return <main className="reels-page">
    <button className="reels-refresh" aria-label="Refresh reels" onClick={() => void load()}><RotateCw /></button>
    {loading ? <div className="reels-empty">Loading reels...</div> : error && !reels.length ? <div className="reels-empty"><p role="alert">{error}</p><button onClick={() => void load()}>Try again</button></div> : reels.length ? <div className="reels-feed" onScroll={onFeedScroll}>{reels.map((reel) => <ReelCard key={reel.id} reel={reel} onLike={toggleLike} onComments={openComments} onView={recordView} />)}{loadingMore && <div className="reels-loading-more">Loading more reels…</div>}</div> : <div className="reels-empty"><Play /><h1>No reels yet</h1><p>Videos from local shops will appear here.</p></div>}
    {error && reels.length > 0 && <p className="reels-inline-error" role="alert">{error}</p>}
    <BottomNav />
    <Dialog isOpen={Boolean(commentsFor)} onClose={() => setCommentsFor(null)} title={commentsFor ? `Comments · ${commentsFor.shop_name}` : 'Comments'}>
      <div className="reel-comments">{commentsLoading ? <p>Loading comments…</p> : comments.length ? comments.map((comment) => <div className="reel-comment" key={comment.id}><strong>{comment.author_name || 'Customer'}</strong><p>{comment.body}</p></div>) : <p>No comments yet. Start the conversation.</p>}<div className="reel-comment-form"><input value={commentDraft} onChange={(event) => setCommentDraft(event.target.value.slice(0, 500))} placeholder="Add a comment…" maxLength={500} /><button onClick={() => void addComment()} disabled={commentSaving || !commentDraft.trim()}>{commentSaving ? 'Posting…' : 'Post'}</button></div></div>
    </Dialog>
  </main>;
}
