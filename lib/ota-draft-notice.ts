export const SOURCE_NOTES_SEPARATOR='\nNguồn và lưu ý trước đó:\n';
type NoticeDraft={revision:number;status:string;notes:string;stale?:boolean};
// What the draft panel shows above the reply; stored notes stay untouched as history.
// Notes are written when a version is composed, so their "awaiting approval"
// wording is only shown while that version is still pending.
export function draftNotice(d:NoticeDraft|undefined):{status:string;note:string}{
 const note=d?.notes?.split(SOURCE_NOTES_SEPARATOR)[0]||'Chưa có mẫu phù hợp. Soạn dựa trên lời khách và nguồn đã kiểm chứng.';
 if(!d||!['approved','sent'].includes(d.status))return {status:'',note};
 const composed=note.replace(/[;,]\s*(?:cần duyệt phiên bản này|chưa được duyệt)(?=\.)/g,'');
 if(d.status==='sent')return {status:`Phiên bản ${d.revision} đã được ghi nhận gửi thủ công trên OTA.`,note:composed};
 if(d.stale)return {status:`Có tin khách mới sau khi duyệt phiên bản ${d.revision}; duyệt lại trước khi copy gửi.`,note:composed};
 return {status:`Phiên bản ${d.revision} đã duyệt; chưa ghi nhận gửi. Copy, gửi trên OTA rồi ghi nhận lại.`,note:composed};
}
