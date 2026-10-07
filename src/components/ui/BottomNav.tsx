'use client';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Play, ShoppingCart, Send, Wrench } from 'lucide-react';
const items=[{label:'Home',icon:Home,path:'/home'},{label:'Reels',icon:Play,path:'/reels'},{label:'Shops',icon:ShoppingCart,path:'/shops'},{label:'Travel',icon:Send,path:'/travel'},{label:'Services',icon:Wrench,path:'/services'}];
export function BottomNav(){const pathname=usePathname();const router=useRouter();if(['/auth','/admin','/merchant','/payment'].some(p=>pathname.startsWith(p)))return null;
return <nav aria-label="Main navigation" className="reference-nav">{items.map(({label,icon:Icon,path})=>{const active=pathname===path||(path==='/shops'&&(pathname.startsWith('/shop/')||pathname.startsWith('/product/')));return <button key={path} onClick={()=>router.push(path)} aria-current={active?'page':undefined} className={active?'active':''}><Icon size={22} fill={label==='Home'||label==='Reels'||label==='Travel'?'currentColor':'none'}/><span>{label}</span></button>})}</nav>}
