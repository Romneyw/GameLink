(function(){
'use strict';
let active=null;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function node(tag,text){const e=document.createElement(tag);e.textContent=text;return e;}
function setup(){
 if(document.getElementById('gamelink-notification-style'))return;
 const style=node('style',`.gl-unread{display:inline-flex!important;align-items:center;justify-content:center;min-width:21px;height:21px;padding:0 6px;margin-left:6px;background:#ec2459;color:#fff;font:700 11px Arial;border-radius:20px;vertical-align:middle}.gl-unread[hidden]{display:none!important}.gl-message-toast{position:fixed;right:18px;bottom:22px;z-index:9999;width:min(340px,calc(100vw - 36px));display:flex;align-items:center;gap:12px;padding:18px;border:1px solid #db4a76;border-radius:16px;background:#201523;color:#fff;box-shadow:0 14px 50px #0008;font:14px/1.5 Arial}.gl-message-toast[hidden]{display:none}.gl-message-toast a{color:#fff;text-decoration:none;flex:1}.gl-message-toast strong{display:block;margin-bottom:4px}.gl-message-toast button{border:1px solid #705161;border-radius:8px;padding:8px 12px;background:#30222b;color:white;cursor:pointer}.gl-message-toast a:focus-visible,.gl-message-toast button:focus-visible{outline:3px solid #ff92b0;outline-offset:3px}`);style.id='gamelink-notification-style';document.head.append(style);
 const toast=node('div','');toast.id='gamelink-message-toast';toast.className='gl-message-toast';toast.hidden=true;toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');
 const link=node('a','');link.id='gamelink-toast-link';const close=node('button','×');close.type='button';close.setAttribute('aria-label','Dismiss notification');close.addEventListener('click',()=>toast.hidden=true);toast.append(link,close);document.body.append(toast);
}
function paint(data,error){
 document.querySelectorAll('[data-unread-total]').forEach(el=>{el.textContent=error?'?':data.total>99?'99+':String(data.total);el.hidden=!error&&!data.total;el.classList.add('gl-unread');el.setAttribute('aria-label',error?'Unread count unavailable':data.total+' unread messages');el.title=error?'Could not check new messages. Retrying automatically.':'';});
 document.dispatchEvent(new CustomEvent('gamelink-unread',{detail:{...data,error}}));
}
function start(client,options={}){
 if(active)active.stop();setup();
 let stopped=false,busy=false,baseline=null,initialized=false,account=null,epoch=0,lastData={total:0,threads:[]};
 const toast=document.getElementById('gamelink-message-toast');
 const reset=()=>{epoch++;account=null;baseline=null;initialized=false;lastData={total:0,threads:[]};toast.hidden=true;paint(lastData,false);};
 async function refresh(){
  if(stopped||busy||document.hidden)return;busy=true;const version=epoch;let timer;
  try{
   const session=await client.auth.getSession();if(stopped||version!==epoch)return;if(session.error)throw session.error;
   const id=session.data.session?.user.id;if(!id){if(account)reset();return;}
   if(account&&account!==id){reset();return;}account=id;
   const c=new AbortController();timer=setTimeout(()=>c.abort(),12000);
   const r=await client.rpc('gamelink_unread_summary').abortSignal(c.signal);if(r.error)throw r.error;if(stopped||version!==epoch)return;
   const data=r.data;if(!data||!Array.isArray(data.threads))throw new Error('Unread count unavailable');
   const latest=data.latest;
   if(initialized&&latest&&latest.id!==baseline&&!latest.read_at&&uuid.test(latest.peer_id)&&!options.isViewing?.(latest.peer_id)){
    const link=document.getElementById('gamelink-toast-link');link.replaceChildren(node('strong','New message'),node('span','Open your conversation →'));link.href='chat.html?player='+encodeURIComponent(latest.peer_id);toast.hidden=false;
   }
   baseline=latest?.id||null;initialized=true;lastData=data;paint(data,false);if(!data.total)toast.hidden=true;
  }catch(e){if(!stopped&&version===epoch)paint(lastData,true);}finally{clearTimeout(timer);busy=false;}
 }
 const auth=client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||(account&&session?.user.id!==account))reset();});
 const visible=()=>{if(!document.hidden)void refresh();};
 const timer=setInterval(refresh,5000);document.addEventListener('visibilitychange',visible);
 function stop(){stopped=true;epoch++;clearInterval(timer);auth.data.subscription.unsubscribe();document.removeEventListener('visibilitychange',visible);toast.hidden=true;paint({total:0,threads:[]},false);}
 active={refresh,stop};void refresh();return active;
}
window.GameLinkNotifications={start};
})();
