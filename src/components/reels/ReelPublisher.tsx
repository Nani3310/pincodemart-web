'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit, Eye, EyeOff, Loader2, Trash2, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import type { Product, Shop } from '@/types';

type ManagedReel = {
  id: string;
  shop_id: string;
  product_id: string | null;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number;
  is_published: boolean;
  views_count: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
};

const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
const MAX_POSTER_BYTES = 2 * 1024 * 1024;

function apiUrl(functionName: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) throw new Error('Supabase is not configured.');
  return `${base.replace(/\/$/, '')}/functions/v1/${functionName}`;
}

async function createPoster(file: File): Promise<Blob> {
  const source = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = source;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('The video could not be inspected.'));
    });
    video.currentTime = Math.min(0.1, Math.max(0, video.duration - 0.1));
    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve();
      video.onerror = () => reject(new Error('Could not create a reel cover.'));
    });
    const width = Math.min(video.videoWidth || 720, 720);
    const height = Math.max(1, Math.round(width * ((video.videoHeight || 1280) / (video.videoWidth || 720))));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')?.drawImage(video, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    if (!blob || blob.size < 1 || blob.size > MAX_POSTER_BYTES) throw new Error('The reel cover could not be prepared.');
    return blob;
  } finally {
    URL.revokeObjectURL(source);
  }
}

type UploadResponse = {
  upload_id: string;
  upload_url: string;
  poster_upload_url?: string;
  required_headers?: Record<string, string>;
  poster_required_headers?: Record<string, string>;
};

async function authorizedRequest(functionName: string, body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Please sign in again before publishing a reel.');
  const response = await fetch(apiUrl(functionName), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || payload?.message || `Reel upload failed (${response.status}).`);
  return payload as UploadResponse;
}

export function ReelPublisher({ shop, products }: { shop: Shop; products: Product[] }) {
  const [reels, setReels] = useState<ManagedReel[]>([]);
  const [title, setTitle] = useState('');
  const [productId, setProductId] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<ManagedReel | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editProductId, setEditProductId] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const reelLimit = shop.merchant_plan === 'paid' ? 30 : 10;

  const loadReels = useCallback(async () => {
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from('reels')
      .select('id, shop_id, product_id, title, video_url, thumbnail_url, duration_seconds, is_published, views_count, likes_count, comments_count, created_at')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false });
    if (queryError) setError(queryError.message);
    else setReels((data ?? []) as ManagedReel[]);
    setLoading(false);
  }, [shop.id]);

  useEffect(() => { void Promise.resolve().then(loadReels); }, [loadReels]);

  const selectedProduct = useMemo(() => products.find((product) => product.id === productId), [productId, products]);

  const publish = async () => {
    if (uploading) return;
    try {
      setError('');
      setMessage('');
      if (shop.status !== 'approved') throw new Error('Your shop must be approved before publishing reels.');
      if (reels.length >= reelLimit) throw new Error(`Your shop has reached its ${reelLimit} reel limit.`);
      if (!title.trim() || title.trim().length > 120) throw new Error('Enter a reel title up to 120 characters.');
      if (!videoFile) throw new Error('Choose an MP4 video first.');
      if (videoFile.type !== 'video/mp4') throw new Error('Reels must be MP4 videos.');
      if (videoFile.size < 1 || videoFile.size > MAX_VIDEO_BYTES) throw new Error('The video must be 80 MB or smaller.');
      setUploading(true);

      const source = URL.createObjectURL(videoFile);
      const duration = await new Promise<number>((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = source;
        video.onloadedmetadata = () => resolve(video.duration);
        video.onerror = () => reject(new Error('The video duration could not be read.'));
      }).finally(() => URL.revokeObjectURL(source));
      const durationSeconds = Math.ceil(duration);
      if (!Number.isFinite(duration) || durationSeconds < 1 || durationSeconds > 60) throw new Error('Reels must be between 1 and 60 seconds.');
      const poster = await createPoster(videoFile);
      const requestId = crypto.randomUUID();
      const ticket = await authorizedRequest('reel-upload-url', {
        client_request_id: requestId,
        shop_id: shop.id,
        product_id: selectedProduct?.id || null,
        title: title.trim(),
        content_type: 'video/mp4',
        content_length: videoFile.size,
        duration_seconds: durationSeconds,
        poster_content_type: 'image/jpeg',
        poster_content_length: poster.size,
      });

      const upload = async (url: string, blob: Blob, headers: Record<string, string>) => {
        const response = await fetch(url, { method: 'PUT', headers, body: blob });
        if (!response.ok) throw new Error(`Cloudflare upload failed (${response.status}).`);
      };
      await upload(ticket.upload_url, videoFile, ticket.required_headers ?? { 'Content-Type': 'video/mp4' });
      if (ticket.poster_upload_url) await upload(ticket.poster_upload_url, poster, ticket.poster_required_headers ?? { 'Content-Type': 'image/jpeg' });
      await authorizedRequest('reel-finalize', { upload_id: ticket.upload_id });
      setTitle('');
      setProductId('');
      setVideoFile(null);
      setMessage('Reel published successfully.');
      await loadReels();
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'Reel could not be published.');
    } finally {
      setUploading(false);
    }
  };

  const togglePublished = async (reel: ManagedReel) => {
    setBusyId(reel.id); setError('');
    const { error: updateError } = await supabase.from('reels').update({ is_published: !reel.is_published }).eq('id', reel.id).eq('shop_id', shop.id);
    if (updateError) setError(updateError.message);
    else setReels((current) => current.map((item) => item.id === reel.id ? { ...item, is_published: !item.is_published } : item));
    setBusyId(null);
  };

  const deleteReel = async (reel: ManagedReel) => {
    if (!window.confirm('Delete this reel permanently?')) return;
    setBusyId(reel.id); setError('');
    const { error: deleteError } = await supabase.from('reels').delete().eq('id', reel.id).eq('shop_id', shop.id);
    if (deleteError) setError(deleteError.message);
    else setReels((current) => current.filter((item) => item.id !== reel.id));
    setBusyId(null);
  };

  const openEdit = (reel: ManagedReel) => { setEditing(reel); setEditTitle(reel.title); setEditProductId(reel.product_id ?? ''); };
  const saveEdit = async () => {
    if (!editing || savingEdit) return;
    setSavingEdit(true); setError('');
    const cleanTitle = editTitle.trim();
    if (!cleanTitle || cleanTitle.length > 120) { setError('Enter a reel title up to 120 characters.'); setSavingEdit(false); return; }
    const { error: updateError } = await supabase.from('reels').update({ title: cleanTitle, product_id: editProductId || null }).eq('id', editing.id).eq('shop_id', shop.id);
    if (updateError) setError(updateError.message);
    else { setReels((current) => current.map((item) => item.id === editing.id ? { ...item, title: cleanTitle, product_id: editProductId || null } : item)); setEditing(null); }
    setSavingEdit(false);
  };

  return (
    <section className="mb-6" aria-labelledby="merchant-reels-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div><h2 id="merchant-reels-heading" className="text-lg font-bold text-text-primary">Reels</h2><p className="text-sm text-text-secondary">Publish up to {reelLimit} Cloudflare-hosted videos for your shop.</p></div>
        <span className="text-sm text-text-secondary">{reels.length}/{reelLimit}</span>
      </div>
      {error && <p role="alert" className="mb-3 rounded-lg border border-primary-accent/35 bg-primary-accent/10 p-3 text-sm text-error">{error}</p>}
      {message && <p className="mb-3 rounded-lg border border-primary/35 bg-green-light p-3 text-sm text-primary-dark">{message}</p>}
      {shop.status !== 'approved' ? <Card className="p-5 text-sm text-text-secondary">Your shop must be approved before publishing reels.</Card> : (
        <Card className="mb-4 p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
            <Input label="Reel title" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="Show customers what is new" />
            <label className="block text-sm font-medium text-text-primary">Linked product<select value={productId} onChange={(event) => setProductId(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"><option value="">No product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
          </div>
          <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-primary/45 bg-primary-light/30 p-3 text-sm text-text-secondary"><Upload className="h-5 w-5 shrink-0 text-primary-dark" /><span className="min-w-0 flex-1"><span className="block font-semibold text-text-primary">{videoFile ? videoFile.name : 'Choose an MP4 video'}</span><span className="block text-xs">1–60 seconds, up to 80 MB. A cover is generated automatically.</span></span><input className="sr-only" type="file" accept="video/mp4" onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)} /></label>
          <Button className="mt-3 w-full" onClick={() => void publish()} disabled={uploading || reels.length >= reelLimit}>{uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading to Cloudflare…</> : 'Publish reel'}</Button>
        </Card>
      )}
      {loading ? <Card className="p-5 text-center text-sm text-text-secondary">Loading reels…</Card> : reels.length === 0 ? <Card className="p-5 text-center text-sm text-text-secondary">No reels published yet.</Card> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{reels.map((reel) => <Card key={reel.id} className="overflow-hidden"><div className="aspect-video bg-black">{reel.thumbnail_url ? <img src={reel.thumbnail_url} alt="" className="h-full w-full object-cover" /> : <video src={reel.video_url} muted preload="metadata" className="h-full w-full object-cover" aria-label={reel.title} />}</div><div className="p-3"><p className="truncate font-semibold text-text-primary">{reel.title}</p><p className="mt-1 text-xs text-text-secondary">{reel.views_count} views · {reel.likes_count} likes · {reel.comments_count} comments</p><div className="mt-3 flex gap-2"><Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(reel)} disabled={busyId === reel.id}><Edit className="mr-1 h-3 w-3" />Edit</Button><Button size="sm" variant="outline" className="flex-1" onClick={() => void togglePublished(reel)} disabled={busyId === reel.id}>{reel.is_published ? <><EyeOff className="mr-1 h-3 w-3" />Hide</> : <><Eye className="mr-1 h-3 w-3" />List</>}</Button><Button size="sm" variant="outline" onClick={() => void deleteReel(reel)} disabled={busyId === reel.id} aria-label="Delete reel"><Trash2 className="h-3 w-3" /></Button></div></div></Card>)}</div>}
      <Dialog isOpen={Boolean(editing)} onClose={() => setEditing(null)} title="Edit reel"><div className="space-y-4"><Input label="Reel title" value={editTitle} maxLength={120} onChange={(event) => setEditTitle(event.target.value)} /><label className="block text-sm font-medium text-text-primary">Linked product<select value={editProductId} onChange={(event) => setEditProductId(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"><option value="">No product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><div className="flex gap-3"><Button variant="outline" className="flex-1" onClick={() => setEditing(null)}>Cancel</Button><Button className="flex-1" onClick={() => void saveEdit()} disabled={savingEdit}>{savingEdit ? 'Saving…' : 'Save changes'}</Button></div></div></Dialog>
    </section>
  );
}
