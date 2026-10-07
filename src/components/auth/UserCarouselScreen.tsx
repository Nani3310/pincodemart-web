'use client';
import {useRouter} from 'next/navigation';
import {supabase} from '@/lib/supabase';
import ReferenceOnboarding from './ReferenceOnboarding';
export default function UserCarouselScreen(){const router=useRouter();const complete=async()=>{const {data:{user}}=await supabase.auth.getUser();if(user)await supabase.from('profiles').update({onboarding_completed:true}).eq('id',user.id);const role=sessionStorage.getItem('pincodemart-login-role');sessionStorage.removeItem('pincodemart-login-role');router.push(role==='merchant'?'/merchant/store':'/home');};return <ReferenceOnboarding onComplete={complete}/>;}
