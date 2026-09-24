(function(){
'use strict';
const $=id=>document.getElementById(id),peer=new URLSearchParams(location.search).get('player');
const valid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(peer||'');
let client,signup=false,busy=false;
function go(user){location.replace(user.id===peer?'dashboard.html':'chat.html?player='+encodeURIComponent(peer));}
function mode(on){if(busy)return;signup=on;$('name-field').hidden=!on;$('username').required=on;$('login-mode').setAttribute('aria-pressed',String(!on));$('signup-mode').setAttribute('aria-pressed',String(on));$('password').autocomplete=on?'new-password':'current-password';$('submit').textContent=on?'Create account & open chat →':'Log in & open chat →';$('status').textContent='';}
$('login-mode').addEventListener('click',()=>mode(false));$('signup-mode').addEventListener('click',()=>mode(true));
$('auth-form').addEventListener('submit',async e=>{
 e.preventDefault();if(busy||!client||!valid)return;
 const email=$('email').value.trim(),password=$('password').value,username=$('username').value.trim();
 if(signup&&!username){$('status').textContent='Enter your gamer name.';return;}
 busy=true;$('submit').disabled=true;$('submit').textContent='Connecting…';$('status').textContent='';
 try{
  const redirect=new URL('chat-login.html',location.href);redirect.searchParams.set('player',peer);
  const r=signup?await client.auth.signUp({email,password,options:{data:{username},emailRedirectTo:redirect.href}}):await client.auth.signInWithPassword({email,password});
  if(r.error)throw r.error;
  if(r.data.session){go(r.data.user);return;}
  $('status').textContent='Check your email to confirm your account. Then return to this page and log in to continue the chat.';
 }catch(e){$('status').textContent=e.message||'Could not connect. Please try again.';}
 finally{busy=false;$('submit').disabled=false;$('submit').textContent=signup?'Create account & open chat →':'Log in & open chat →';}
});
async function init(){
 if(!valid){$('status').textContent='This chat link is incomplete. Open the gamer’s card and tap Chat with me again.';return;}
 $('back-card').href='gamer-profile.html?id='+encodeURIComponent(peer);
 try{if(!window.supabase)throw new Error('Could not connect. Refresh this page to try again.');
 client=window.supabase.createClient('https://arlhkjocegnppfziikpo.supabase.co','sb_publishable_aWWQyhe1KrXskToB9nU2_A_SsFpUPbv');
 // Enable the form without waiting for a network account check.
 $('submit').disabled=false;$('status').textContent='';
 const r=await client.auth.getSession();if(r.error)throw r.error;if(r.data.session&&!busy)go(r.data.session.user);
 }catch(e){$('status').textContent=e.message;}
}
void init();
})();
