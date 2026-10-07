'use client';
import { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Dialog } from './Dialog';
import { Button } from './Button';
import { useRouter } from 'next/navigation';
export function ConcernButton() {
 const [open,setOpen]=useState(false); const router=useRouter();
 return <><button className="concern-button" onClick={()=>setOpen(true)}><TriangleAlert size={18} fill="currentColor"/><span>Concern</span></button><Dialog isOpen={open} onClose={()=>setOpen(false)} title="Have a concern?"><p className="mb-4 text-slate-600">Manage your account or review our policies for help with the marketplace.</p><div className="grid gap-3"><Button onClick={()=>router.push('/settings')}>Account & settings</Button><Button variant="outline" onClick={()=>router.push('/legal')}>Help & policies</Button></div></Dialog></>;
}
