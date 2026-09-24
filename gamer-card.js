(function(){
'use strict';
const $=id=>document.getElementById(id),canvas=$('card-canvas'),ctx=canvas.getContext('2d');
const publicMode=document.body.dataset.public==='true';
let profileURL='',sharingClient=null,shareBusy=false;
const games=['Blood Strike','Brawlhalla','Free Fire','Fortnite','Minecraft','Call of Duty Mobile','FC Mobile','Dream League Soccer','eFootball','PUBG Mobile','Roblox'];
const fields=['gamer-name','platform','language','player-id','play-times','timezone','play-style','microphone','zoom','position-x','position-y','accent','card-font','background'];
let backgroundImage=null,backgroundData=null,backgroundVersion=0;
let avatar=null,avatarData=null,db=null,timer,restoring=true,saveQueue=Promise.resolve(),imageVersion=0;
for(let i=0;i<3;i++){
 const row=document.createElement('div');row.className='game-row';
 const label=document.createElement('label');label.htmlFor='game-'+i;label.textContent='Game '+(i+1);
 const select=document.createElement('select');select.id='game-'+i;
 for(const value of ['',...games]){const option=document.createElement('option');option.value=value;option.textContent=value||'Choose a game';select.append(option);}
 const rankLabel=document.createElement('label');rankLabel.htmlFor='rank-'+i;rankLabel.textContent='Rank / division / experience — optional';
 const input=document.createElement('input');input.id='rank-'+i;input.maxLength=60;input.placeholder='For example: Gold or Beginner';
 row.append(label,select,rankLabel,input);$('game-fields').append(row);fields.push('game-'+i,'rank-'+i);
}
try{for(const zone of Intl.supportedValuesOf('timeZone')){const o=document.createElement('option');o.value=zone;$('timezones').append(o);}}catch{}
$('timezone').value=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
function design(){return document.querySelector('input[name="design"]:checked').value;}
function value(id,fallback){return $(id).value.trim()||fallback||'';}
function text(str,x,y,size=28,color='#eff0f7',weight='400',width=900){ctx.font=weight+' '+size+'px '+(size>=40?value('card-font','Arial'):'Arial');ctx.fillStyle=color;while(ctx.measureText(str).width>width&&size>15){size--;ctx.font=weight+' '+size+'px '+(size>=40?value('card-font','Arial'):'Arial');}if(ctx.measureText(str).width>width){while(str.length&&ctx.measureText(str+'…').width>width)str=str.slice(0,-1);str+='…';}ctx.fillText(str,x,y);}
function rect(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
function avatarPath(d){ctx.beginPath();if(d==='ion')ctx.arc(540,397,207,0,Math.PI*2);else if(d==='venom'){const x=310,y=175,w=460,h=450,c=55;ctx.moveTo(x+c,y);ctx.lineTo(x+w-c,y);ctx.lineTo(x+w,y+c);ctx.lineTo(x+w,y+h-c);ctx.lineTo(x+w-c,y+h);ctx.lineTo(x+c,y+h);ctx.lineTo(x,y+h-c);ctx.lineTo(x,y+c);ctx.closePath();}else ctx.roundRect(310,175,460,450,36);}
function render(){
 const d=design(),accent=/^#[0-9a-f]{6}$/i.test(value('accent'))?value('accent'):'#ff4775';ctx.clearRect(0,0,1080,1440);
 rect(0,0,1080,1440,42,'#090c14');
 if(backgroundImage&&value('background')==='photo'){ctx.save();ctx.beginPath();ctx.roundRect(0,0,1080,1440,42);ctx.clip();const scale=Math.max(1080/backgroundImage.width,1440/backgroundImage.height),w=backgroundImage.width*scale,h=backgroundImage.height*scale;ctx.drawImage(backgroundImage,(1080-w)/2,(1440-h)/2,w,h);ctx.fillStyle='#090c14c9';ctx.fillRect(0,0,1080,1440);ctx.restore();}const glow=ctx.createRadialGradient(d==='crimson'?930:540,250,20,540,400,760);glow.addColorStop(0,accent+'35');glow.addColorStop(1,'#090c1400');ctx.fillStyle=glow;ctx.fillRect(0,0,1080,1440);
 const metal=ctx.createLinearGradient(0,0,1080,1440);metal.addColorStop(0,'#f1f1f5');metal.addColorStop(.24,'#353d4b');metal.addColorStop(.5,'#9ea6b4');metal.addColorStop(.75,'#202937');metal.addColorStop(1,'#8e96a2');rect(18,18,1044,1404,32,null,metal);rect(30,30,1020,1380,26,null,accent+'55');
 const pattern=value('background')==='signature'?d:value('background');
 ctx.save();ctx.strokeStyle=accent+'20';ctx.lineWidth=1;if(pattern==='venom'||pattern==='grid'){for(let x=60;x<1040;x+=40){ctx.beginPath();ctx.moveTo(x,120);ctx.lineTo(x,680);ctx.stroke();}for(let y=120;y<700;y+=40){ctx.beginPath();ctx.moveTo(60,y);ctx.lineTo(1020,y);ctx.stroke();}}else if(pattern==='crimson'){ctx.fillStyle=accent+'12';ctx.beginPath();ctx.moveTo(700,35);ctx.lineTo(1040,35);ctx.lineTo(650,660);ctx.lineTo(450,660);ctx.fill();}else if(pattern==='ion'||pattern==='orbits'){for(let r=245;r<380;r+=40){ctx.beginPath();ctx.arc(540,397,r,0,Math.PI*2);ctx.stroke();}}ctx.restore();
 text('GAME',68,95,31,accent,'900',130);text('LINK',170,95,31,'#fff','900',100);text('STANDARD / '+d.toUpperCase(),680,95,19,'#c0c6d2','700',330);
 ctx.save();avatarPath(d);ctx.clip();ctx.fillStyle='#161e2b';ctx.fillRect(290,160,500,490);
 if(avatar){const w=460,h=450,scale=Math.max(w/avatar.width,h/avatar.height)*Number($('zoom').value),dw=avatar.width*scale,dh=avatar.height*scale;ctx.drawImage(avatar,310-(dw-w)*Number($('position-x').value)/100,175-(dh-h)*Number($('position-y').value)/100,dw,dh);}else{ctx.fillStyle=accent+'30';ctx.beginPath();ctx.arc(540,330,88,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(540,555,180,130,0,0,Math.PI*2);ctx.fill();}ctx.restore();avatarPath(d);ctx.strokeStyle=accent;ctx.lineWidth=4;ctx.shadowColor=accent;ctx.shadowBlur=16;ctx.stroke();ctx.shadowBlur=0;
 text('PLAYER IDENTITY',72,698,20,accent,'700');text(value('gamer-name','YOUR GAMER NAME'),68,771,64,'#fff','900',940);
 text(value('platform','Mobile')+'  /  '+value('play-style','Casual'),72,819,24,'#bcc5d4','700',940);
 let filled=0;for(let i=0;i<3;i++){const game=value('game-'+i);if(!game)continue;const y=856+filled*68;rect(68,y,944,58,10,'#131c29','#303b4a');text(game,86,y+38,27,'#fff','700',470);const rank=value('rank-'+i);text(rank||'Rank not listed',590,y+37,22,rank?accent:'#8e99ab','400',400);filled++;}
 if(!filled)text('Your favourite games will appear here',72,905,27,'#8692a5');
 const items=[['LANGUAGE',value('language','Not specified')],['MICROPHONE',value('microphone','Mic on')],['PLAY TIMES',value('play-times','Not specified')],['TIMEZONE',value('timezone','UTC')]];
 items.forEach(([label,v],i)=>{const x=i%2?560:72,y=1110+Math.floor(i/2)*90;text(label,x,y,17,accent,'700',450);text(v,x,y+34,26,'#e4e9f0','400',440);});
 text('PUBLIC PLAYER ID',72,1300,16,'#8797ad','700');text(value('player-id','Not listed'),290,1300,22,'#d0d8e6','400',720);
 ctx.fillStyle='#303948';ctx.fillRect(68,1330,944,1);text('GAMELINK / FIND YOUR PEOPLE',72,1360,20,accent,'700',600);if(profileURL)text(profileURL.replace(/^https?:\/\//,''),72,1400,17,'#e4e9f0','400',936);text('Ranks are self-reported',710,1370,17,'#929caf','400',300);
 canvas.setAttribute('aria-label','Gamer card for '+value('gamer-name','your gamer name')+', '+d+' design. '+items.map(x=>x.join(': ')).join('. '));
}
function snapshot(){return{version:1,values:Object.fromEntries(fields.map(id=>[id,$(id).value])),design:design(),avatar:avatarData,backgroundImage:backgroundData};}
function dbWrite(draft){return new Promise((resolve,reject)=>{const tx=db.transaction('drafts','readwrite');tx.objectStore('drafts').put(draft,'current');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Draft save interrupted'));});}
function save(){if(restoring)return;clearTimeout(timer);timer=setTimeout(()=>{if(!db){$('draft-status').textContent='Device storage is unavailable. Keep this page open to retain your draft.';return;}const draft=snapshot();$('draft-status').textContent='Saving draft on this device…';saveQueue=saveQueue.catch(()=>{}).then(()=>dbWrite(draft)).then(()=>{$('draft-status').textContent='Draft saved on this device.';}).catch(()=>{$('draft-status').textContent='Draft could not be saved. Keep this page open to retain your work.';});},250);}
function changed(){render();save();if(profileURL)$('share-status').textContent='You have local changes. Publish again to update the profile page.';}
function decode(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Could not read that image. Try another JPG, PNG or WebP.'));img.src=src;});}
$('card-form').addEventListener('submit',e=>e.preventDefault());$('card-form').addEventListener('input',e=>{if(!['avatar-file','background-file'].includes(e.target.id))changed();});$('card-form').addEventListener('change',e=>{if(!['avatar-file','background-file'].includes(e.target.id))changed();});
$('avatar-file').addEventListener('change',async e=>{
 const file=e.target.files[0];if(!file)return;const version=++imageVersion;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024){$('avatar-status').textContent='Choose a JPG, PNG or WebP smaller than 8 MB.';return;}
 let url;try{$('avatar-status').textContent='Preparing avatar…';url=URL.createObjectURL(file);const original=await decode(url);if(version!==imageVersion)return;
 const resized=document.createElement('canvas'),scale=Math.min(1,1024/Math.max(original.width,original.height));resized.width=Math.round(original.width*scale);resized.height=Math.round(original.height*scale);resized.getContext('2d').drawImage(original,0,0,resized.width,resized.height);const data=resized.toDataURL('image/png');const loaded=await decode(data);if(version!==imageVersion)return;avatar=loaded;avatarData=data;$('zoom').value='1';$('position-x').value='50';$('position-y').value='50';$('avatar-controls').hidden=false;$('avatar-status').textContent='Use the sliders to position your avatar.';changed();
 }catch(error){$('avatar-status').textContent=error.message;}finally{if(url)URL.revokeObjectURL(url);e.target.value='';}
});
$('remove-avatar').addEventListener('click',()=>{imageVersion++;avatar=null;avatarData=null;$('avatar-controls').hidden=true;$('avatar-status').textContent='';changed();});

$('surprise').addEventListener('click',()=>{
 const pick=items=>items[Math.floor(Math.random()*items.length)];
 document.querySelector('input[value="'+pick(['crimson','ion','venom'])+'"]').checked=true;
 $('accent').value=pick(['#ff4775','#47dfff','#b8ff45','#b596ff','#ffbd69']);
 $('card-font').value=pick(['Arial','Georgia','monospace']);$('background').value=pick(['signature','grid','orbits','clean']);
 $('style-status').textContent='Fresh look! Your name, avatar and gaming details are unchanged.';changed();
});
$('preview-size').addEventListener('click',()=>{const panel=document.querySelector('.preview-panel'),expanded=panel.classList.toggle('expanded');$('preview-size').setAttribute('aria-expanded',String(expanded));$('preview-size').textContent=expanded?'Shrink preview':'Expand preview';});
$('background-file').addEventListener('change',async e=>{
 const file=e.target.files[0];if(!file)return;const version=++backgroundVersion;let url;
 try{
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024)throw new Error('Choose a JPG, PNG or WebP smaller than 8 MB.');
 $('background-status').textContent='Preparing background…';url=URL.createObjectURL(file);const original=await decode(url);
 const resized=document.createElement('canvas'),scale=Math.min(1,1440/Math.max(original.width,original.height));resized.width=Math.round(original.width*scale);resized.height=Math.round(original.height*scale);resized.getContext('2d').drawImage(original,0,0,resized.width,resized.height);
 const data=resized.toDataURL('image/jpeg',.85),loaded=await decode(data);if(version!==backgroundVersion)return;
 backgroundImage=loaded;backgroundData=data;$('background').value='photo';$('background-status').textContent='Your background is ready.';changed();
 }catch(error){if(version===backgroundVersion)$('background-status').textContent=error.message;}finally{if(url)URL.revokeObjectURL(url);e.target.value='';}
});
$('remove-background').addEventListener('click',()=>{backgroundVersion++;backgroundImage=null;backgroundData=null;$('background').value='signature';$('background-status').textContent='';changed();});

$('reset-draft').addEventListener('click',()=>{if(!confirm('Start a new card? This replaces the draft on this device.'))return;profileURL='';$('published-link').hidden=true;imageVersion++;backgroundVersion++;backgroundImage=null;backgroundData=null;$('background-status').textContent='';$('card-form').reset();$('timezone').value=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';avatar=null;avatarData=null;$('avatar-controls').hidden=true;changed();});
async function init(){
 if(publicMode){await loadPublic();return;}
 render();$('card-form').inert=true;$('reset-draft').disabled=true;
 try{db=await new Promise((resolve,reject)=>{const req=indexedDB.open('gamelink-card-editor',1);req.onupgradeneeded=()=>req.result.createObjectStore('drafts');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(new Error('Storage is busy'));});
 const draft=await new Promise((resolve,reject)=>{const req=db.transaction('drafts').objectStore('drafts').get('current');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
 if(draft?.version===1){for(const id of fields){if(typeof draft.values?.[id]==='string')$(id).value=draft.values[id];}if(['crimson','ion','venom'].includes(draft.design))document.querySelector('input[value="'+draft.design+'"]').checked=true;if(draft.backgroundImage){try{backgroundImage=await decode(draft.backgroundImage);backgroundData=draft.backgroundImage;}catch{$('background-status').textContent='Please select your background image again.';}}if(draft.avatar){try{avatar=await decode(draft.avatar);avatarData=draft.avatar;$('avatar-controls').hidden=false;}catch{$('avatar-status').textContent='The saved avatar could not load. Please select it again.';}}$('draft-status').textContent='Your saved draft is restored.';}else $('draft-status').textContent='Your draft will be saved on this device as you edit.';
 }catch{$('draft-status').textContent='Device storage is unavailable. Keep this page open to retain your draft.';}
 finally{restoring=false;$('card-form').inert=false;$('reset-draft').disabled=false;render();for(const id of ['download-card','publish-card','load-card','unpublish-card'])$(id).disabled=false;}
}
/* SHARING */
function client(){
 if(!window.supabase)throw new Error('The account service did not load. Refresh and try again. PNG downloads still work.');
 if(!sharingClient)sharingClient=window.supabase.createClient('https://arlhkjocegnppfziikpo.supabase.co','sb_publishable_aWWQyhe1KrXskToB9nU2_A_SsFpUPbv');
 return sharingClient;
}
async function query(q){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);try{const result=await q.abortSignal(controller.signal);if(result.error)throw result.error;return result.data;}finally{clearTimeout(timeout);}}
async function owner(){
 let timeout;try{const r=await Promise.race([client().auth.getUser(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Account check took too long. Please try again.')),15000)})]);
 if(r.error?.name==='AuthSessionMissingError'||(!r.error&&!r.data.user)){$('login-help').hidden=false;throw new Error('Log in to publish or load your card. You can download a PNG now.');}if(r.error)throw r.error;return r.data.user;
 }finally{clearTimeout(timeout);}
}
function linkFor(id){const u=new URL('gamer-profile.html',location.href);u.searchParams.set('id',id);return u.href;}
function showLink(id){profileURL=linkFor(id);$('profile-link').value=profileURL;$('open-link').href=profileURL;$('published-link').hidden=false;render();}
async function applyCard(draft){
 if(!draft||draft.version!==1||!draft.values)throw new Error('This card format could not be loaded.');
 const images=await Promise.all([draft.avatar,draft.backgroundImage].map(async src=>{
 if(!src)return null;if(typeof src!=='string'||src.length>5500000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(src))throw new Error('This card contains an unsupported image.');return decode(src);
 }));
 for(const id of fields){const v=draft.values[id];if(typeof v==='string')$(id).value=v.slice(0,120);}
 if(!['Arial','Georgia','monospace'].includes(value('card-font')))$('card-font').value='Arial';
 for(const [id,min,max,def] of [['zoom',1,2.5,1],['position-x',0,100,50],['position-y',0,100,50]]){$(id).value=String(Math.min(max,Math.max(min,Number($(id).value)||def)));}
 document.querySelector('input[value="'+(['crimson','ion','venom'].includes(draft.design)?draft.design:'crimson')+'"]').checked=true;
 avatar=images[0];avatarData=avatar?draft.avatar:null;backgroundImage=images[1];backgroundData=backgroundImage?draft.backgroundImage:null;$('avatar-controls').hidden=!avatar;render();
}
async function task(fn){if(shareBusy)return;shareBusy=true;for(const id of ['publish-card','load-card','unpublish-card'])$(id).disabled=true;$('share-status').textContent='Working…';try{await fn();}catch(e){$('share-status').textContent=['42P01','PGRST205'].includes(e.code)?'Public sharing needs setup. Run card-sharing.sql in Supabase first.':(e.message||'Could not connect. Please try again.');}finally{shareBusy=false;for(const id of ['publish-card','load-card','unpublish-card'])$(id).disabled=false;}}
$('publish-card').addEventListener('click',()=>task(async()=>{
 if(!value('gamer-name')||!fields.some(id=>/^game-\d$/.test(id)&&value(id)))throw new Error('Add your gamer name and at least one game first.');
 const user=await owner(),payload=snapshot();if(new Blob([JSON.stringify(payload)]).size>6000000)throw new Error('These images are too large to publish together. Try smaller images.');
 await query(client().from('gamelink_public_cards').upsert({id:user.id,card:payload},{onConflict:'id'}));showLink(user.id);$('login-help').hidden=true;$('share-status').textContent=JSON.stringify(snapshot())===JSON.stringify(payload)?'Published! Copy your link or download your card with the profile address on it.':'Card published, but you made newer local edits. Publish again to include them.';
}));
$('load-card').addEventListener('click',()=>task(async()=>{
 const user=await owner(),row=await query(client().from('gamelink_public_cards').select('card').eq('id',user.id).maybeSingle());if(!row)throw new Error('You have not published a card yet.');
 if(!confirm('Replace the current draft with your published card?')){$('share-status').textContent='Your current draft was kept.';return;}
 await applyCard(row.card);showLink(user.id);save();$('share-status').textContent='Published card loaded. Edit it, then publish again to update.';
}));
$('unpublish-card').addEventListener('click',()=>task(async()=>{
 const user=await owner();if(!confirm('Remove your public card? Existing downloaded images will remain with anyone who saved them.')){$('share-status').textContent='No changes made.';return;}
 await query(client().from('gamelink_public_cards').delete().eq('id',user.id));profileURL='';$('published-link').hidden=true;render();$('share-status').textContent='Public card removed. Your local draft is still here.';
}));
$('download-card').addEventListener('click',()=>{
 render();$('download-card').disabled=true;canvas.toBlob(blob=>{try{if(!blob)throw new Error('Could not create the image. Please try again.');const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='GameLink-'+(value('gamer-name','gamer').replace(/[^a-z0-9_-]/gi,'-').slice(0,40))+'.png';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);$('share-status').textContent=profileURL?'PNG ready. Share it with your copied profile link.':'PNG ready. Publish your card to get a profile link too.';}catch(e){$('share-status').textContent=e.message;}finally{$('download-card').disabled=false;}},'image/png');
});
$('copy-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(profileURL);$('share-status').textContent='Profile link copied!';}catch{$('profile-link').focus();$('profile-link').select();$('share-status').textContent='Press and hold the selected link to copy it.';}});
$('share-link').addEventListener('click',async()=>{if(!navigator.share){$('copy-link').click();return;}try{await navigator.share({title:'My GameLink gamer card',text:'Find your squad. Here’s my gamer card!',url:profileURL});}catch(e){if(e.name!=='AbortError')$('share-status').textContent='Sharing unavailable. Use Copy profile link instead.';}});
async function loadPublic(){
 const panel=document.querySelector('.preview-panel');panel.hidden=true;
 try{const id=new URLSearchParams(location.search).get('id');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id||''))throw new Error('This profile link is incomplete. Ask the gamer for their full link.');
 const row=await query(client().from('gamelink_public_cards').select('card').eq('id',id).maybeSingle());if(!row)throw new Error('This card is unavailable or has been removed.');
 await applyCard(row.card);profileURL=linkFor(id);render();panel.hidden=false;if($('chat-owner')){$('chat-owner').href='chat.html?player='+encodeURIComponent(id);$('chat-owner').hidden=false;}$('draft-status').textContent=value('gamer-name')+' · Public gamer card · Ranks are self-reported';document.title=value('gamer-name')+' | GameLink';
 }catch(e){$('draft-status').textContent=e.message||'Could not load this card. Refresh to try again.';}
}

void init();
})();
