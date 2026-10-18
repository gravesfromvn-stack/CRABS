'use client';
import {useRef} from 'react';
import {Play, X} from 'lucide-react';

export default function BrandPreview(){
 const dialog=useRef<HTMLDialogElement>(null),video=useRef<HTMLVideoElement>(null);
 function close(){video.current?.pause();dialog.current?.close();}
 return <><button className="brand-preview-trigger" onClick={()=>dialog.current?.showModal()}><Play size={13}/><span>CRABS · 5s</span></button>
 <dialog ref={dialog} className="brand-film" aria-label="Nhận diện CRABS" onCancel={()=>video.current?.pause()} onClick={e=>{if(e.target===e.currentTarget)close();}}>
  <header><span>CRABS / CONNECTED BUSINESS</span><button className="icon-button" aria-label="Đóng video nhận diện" onClick={close}><X size={20}/></button></header>
  <video ref={video} controls playsInline preload="none" poster="/crabs-network.png"><source src="/crabs-intro.mp4" type="video/mp4"/>Trình duyệt chưa hỗ trợ video.</video>
  <p>Connected, Reliable, Automated Business Systems.</p>
 </dialog></>;
}
