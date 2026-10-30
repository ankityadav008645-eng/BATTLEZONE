import { createClient } from '@supabase/supabase-js';
import './style.css';

const envReady = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
const supabase = envReady ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY) : null;
const $ = (s) => document.querySelector(s);
const state = { user:null, profile:null, events:[], entries:[], rooms:[], adminEntries:[], admin:false, tab:'events' };
const esc = (v='') => String(v).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rupee = v => '₹'+Number(v||0).toLocaleString('en-IN');

function shell(){
 $('#app').innerHTML = `
 <header class="top"><div class="brand"><div class="logo">B</div><div><b>BATTLEZONE</b><small>TOURNAMENT HUB</small></div></div><button id="authBtn" class="outline">${state.user?'Sign out':'Player / Owner login'}</button></header>
 <main>
  <section class="hero"><span class="eyebrow">COMMUNITY ESPORTS • PLAY FAIR</span><h1>Play hard.<br>Win together.</h1><p>Discover community tournaments, register your team and track results.</p><div class="stats"><div><b>${state.events.length}</b><small>Events</small></div><div><b>${state.entries.length}</b><small>My entries</small></div><div><b>${state.admin?'OWNER':'PLAYER'}</b><small>Current role</small></div></div></section>
  <nav class="tabs"><button data-tab="events" class="${state.tab==='events'?'active':''}">🏆 Events</button><button data-tab="entries" class="${state.tab==='entries'?'active':''}">🎮 My entries</button><button data-tab="profile" class="${state.tab==='profile'?'active':''}">👤 Profile</button>${state.admin?'<button data-tab="admin" class="'+(state.tab==='admin'?'active':'')+'">🛠 Owner</button>':''}</nav>
  <div id="content"></div>
 </main>
 <footer>Fan-made community app • Not affiliated with Garena / Free Fire.</footer>
 <div id="modal" class="modal hidden"></div><div id="toast" class="toast"></div>`;
 $('#authBtn').onclick=()=>state.user?signOut():authModal();
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{
 state.tab=b.dataset.tab;
 document.querySelectorAll('[data-tab]').forEach(x=>{
  x.classList.toggle('active',x.dataset.tab===state.tab);
 });
 renderContent();
});
 renderContent();
}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.remove('hidden');setTimeout(()=>el.classList.add('hidden'),3200)}
function renderContent(){
 const c=$('#content');
 if(state.tab==='events'){
  c.innerHTML=`<div class="section"><h2>Available tournaments</h2><p class="muted">Choose an event to register.</p></div><div class="cards">${state.events.length?state.events.map(e=>`<article class="card"><div class="row"><span class="tag">${esc(e.mode)} · ${esc(e.map_name||'Map TBA')}</span><span class="status ${e.status==='open'?'green':'red'}">${esc(e.status)}</span></div><h3>${esc(e.title)}</h3><p class="muted">${esc(e.starts_at?new Date(e.starts_at).toLocaleString():'Date to be announced')}</p><div class="metrics"><div><b>${rupee(e.prize_pool)}</b><small>Prize pool*</small></div><div><b>${Number(e.max_slots)}</b><small>Max slots</small></div><div><b>${Number(e.entry_fee)===0?'Free':rupee(e.entry_fee)}</b><small>Entry fee*</small></div></div><button class="primary" data-join="${e.id}" ${e.status!=='open'||!state.user?'disabled':''}>${!state.user?'Login to join':e.status!=='open'?'Closed':'Register team'}</button></article>`).join(''):'<div class="empty">No tournaments published yet. Check again later.</div>'}</div><p class="fine">*Only use real fees/prizes after legal review and a verified payment provider is integrated. This starter does not move money.</p>`;
  c.querySelectorAll('[data-join]').forEach(b=>b.onclick=()=>registerModal(b.dataset.join));
 }else if(state.tab==='entries'){
  c.innerHTML=`<div class="section"><h2>My registrations</h2></div>${state.entries.length?state.entries.map(x=>{
    const room=state.rooms.find(r=>r.tournament_id===x.tournament_id);
    return `<div class="card">
      <div class="row"><b>${esc(x.team_name)}</b><span class="tag">${esc(x.status)}</span></div>
      <p>${esc(x.event_title||'Tournament')}</p>
      <p class="muted">UID: ${esc(x.game_uid)} · ${esc(x.created_at?new Date(x.created_at).toLocaleDateString():'')}</p>
      ${room?`<div class="notice"><h3>🎮 Room Details</h3><p>Room ID: <b>${esc(room.room_id)}</b></p><p>Room Password: <b>${esc(room.room_password)}</b></p></div>`:'<p class="muted">Room details abhi publish nahi hui hain.</p>'}
    </div>`;
  }).join(''):'<div class="empty">Login and register for a tournament to see entries here.</div>'}`;
 }else if(state.tab==='profile'){
  c.innerHTML=`<div class="section"><h2>Your profile</h2></div><div class="card">${state.user?`<p><b>${esc(state.profile?.display_name||state.user.email)}</b></p><p class="muted">${esc(state.user.email)}</p><p class="muted">Role: ${state.admin?'Owner':'Player'}</p>`:'<p>Login to see your profile and registrations.</p>'}<button class="primary" id="profileAuth">${state.user?'Refresh account':'Login / create account'}</button></div><div class="card notice"><b>Security tip</b><p>Never share game passwords, social passwords, OTPs or payment PINs with organizers.</p></div>`;
  $('#profileAuth').onclick=()=>state.user?loadData():authModal();
 }else if(state.tab==='admin'){
  if(!state.admin){c.innerHTML='<div class="empty">Owner permission required.</div>';return}
  c.innerHTML=`<div class="section"><h2>👑 Owner console</h2><p class="muted">Signed in with server-verified owner role.</p></div>
  <div class="card"><h3>Create tournament</h3><form id="eventForm"><label>Title<input name="title" required maxlength="80"></label><div class="two"><label>Mode<select name="mode"><option>Solo</option><option>Duo</option><option>Squad</option></select></label><label>Map<input name="map_name" value="Bermuda"></label></div><label>Start date/time<input name="starts_at" type="datetime-local"></label><div class="two"><label>Max slots<input name="max_slots" type="number" min="2" max="1000" value="48" required></label><label>Entry fee (₹)<input name="entry_fee" type="number" min="0" value="0" required></label></div><label>Prize pool (₹)<input name="prize_pool" type="number" min="0" value="0" required></label><button class="primary">Publish tournament</button></form></div>
  <div class="card"><h3>Manage tournaments</h3>${state.events.map(e=>`<div class="adminrow"><div><b>${esc(e.title)}</b><small>${esc(e.mode)} · ${esc(e.status)}</small></div><button class="outline" data-toggle="${e.id}" data-status="${e.status}">${e.status==='open'?'Close':'Reopen'}</button></div>`).join('')||'<p class="muted">No events.</p>'}</div>
  <div class="card"><h3>Registrations & results</h3><p class="fine">Payment ledger and payout processing are intentionally not enabled in this starter. Integrate a licensed payment provider server-side before handling real money.</p>${state.adminEntries?.length?state.adminEntries.map(x=>`<div class="adminrow"><div><b>${esc(x.team_name)}</b><small>${esc(x.event_title||'')} · ${esc(x.status)}</small></div><span class="tag">${esc(x.game_uid)}</span></div>`).join(''):'<p class="muted">No registrations available.</p>'}</div><div class="card">
   <h3>🎮 Tournament Room Details</h3>
   <form id="roomForm">
    <label>Select tournament
     <select name="tournament_id" required>
      ${state.events.map(e=>`<option value="${e.id}">${esc(e.title)}</option>`).join('')}
     </select>
    </label>
    <label>Room ID
     <input name="room_id" required>
    </label>
    <label>Room Password
     <input name="room_password" required>
    </label>
    <button class="primary">Save Room Details</button>
   </form>
  </div>`;
  $('#eventForm').onsubmit=createEvent;
  $('#roomForm').onsubmit=saveRoom;
  c.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=()=>toggleEvent(b.dataset.toggle,b.dataset.status));
 }
}
function authModal(){
 $('#modal').classList.remove('hidden');
 $('#modal').innerHTML=`<div class="modalbox"><div class="row"><h2>Account login</h2><button class="outline" id="closeModal">Close</button></div><p class="muted">Use your own email. A verification link will be sent by Supabase.</p><form id="authForm"><label>Email<input name="email" type="email" required placeholder="you@example.com"></label><label>Password<input name="password" type="password" required minlength="8" placeholder="At least 8 characters"></label><button class="primary">Sign in / create account</button></form><p class="fine">Owner privileges are never granted from the client. The project owner must assign the owner role securely in the database.</p></div>`;
 $('#closeModal').onclick=()=>$('#modal').classList.add('hidden');
 $('#authForm').onsubmit=async e=>{e.preventDefault();if(!supabase){toast('Backend not configured yet. Follow SETUP.md.');return}const fd=new FormData(e.target),email=fd.get('email'),password=fd.get('password');let r=await supabase.auth.signInWithPassword({email,password});if(r.error){let s=await supabase.auth.signUp({email,password});if(s.error){toast(s.error.message);return}toast('Check your email to confirm account, then sign in.');return}$('#modal').classList.add('hidden');await loadData()};
}
async function signOut(){await supabase?.auth.signOut();state.user=null;state.profile=null;state.admin=false;state.entries=[];state.adminEntries=[];await loadEvents();shell()}
async function loadEvents(){if(!supabase){state.events=[];return}const {data,error}=await supabase.from('tournaments').select('*').order('created_at',{ascending:false});state.events=error?[]:(data||[])}
async function loadData(){
 if(!supabase){shell();toast('Backend not configured yet. Follow SETUP.md.');return}
 const {data:{session}}=await supabase.auth.getSession();state.user=session?.user||null;
 state.admin=false;state.profile=null;state.entries=[];state.adminEntries=[];
 if(state.user){
  const p=await supabase.from('profiles').select('*').eq('id',state.user.id).maybeSingle();state.profile=p.data;
  state.admin=p.data?.role==='owner';
  const r=await supabase.from('registrations').select('*, tournaments(title)').eq('player_id',state.user.id).order('created_at',{ascending:false});
  state.entries=(r.data||[]).map(x=>({...x,event_title:x.tournaments?.title}));
  if(state.admin){const a=await supabase.from('registrations').select('*, tournaments(title)').order('created_at',{ascending:false});state.adminEntries=(a.data||[]).map(x=>({...x,event_title:x.tournaments?.title}));}
 }
 const roomResult = state.user
  ? await supabase.from('tournament_rooms').select('*')
  : { data: [] };

state.rooms = roomResult.data || [];
 await loadEvents();shell();
}
function registerModal(id){
 const ev=state.events.find(x=>x.id===id);if(!ev)return;
 $('#modal').classList.remove('hidden');
 $('#modal').innerHTML=`<div class="modalbox"><div class="row"><h2>Register team</h2><button class="outline" id="closeModal">Close</button></div><p class="muted">${esc(ev.title)}</p><form id="regForm"><input type="hidden" name="tournament_id" value="${esc(id)}"><label>Team/player name<input name="team_name" required maxlength="60"></label><label>In-game UID<input name="game_uid" required maxlength="30"></label><label>Team size<select name="team_size"><option>Solo</option><option>Duo</option><option>Squad</option></select></label><button class="primary">Submit registration</button></form><p class="fine">Registration does not process an entry-fee payment.</p></div>`;
 $('#closeModal').onclick=()=>$('#modal').classList.add('hidden');
 $('#regForm').onsubmit=async e=>{e.preventDefault();let f=new FormData(e.target),payload={tournament_id:id,player_id:state.user.id,team_name:f.get('team_name'),game_uid:f.get('game_uid'),team_size:f.get('team_size')};let {error}=await supabase.from('registrations').insert(payload);if(error){toast(error.message);return}$('#modal').classList.add('hidden');toast('Registration submitted.');await loadData()};
}
async function saveRoom(e){
 e.preventDefault();
 const f=new FormData(e.target);
 const payload={
  tournament_id:f.get('tournament_id'),
  room_id:f.get('room_id').trim(),
  room_password:f.get('room_password').trim(),
  updated_at:new Date().toISOString()
 };
 const {error}=await supabase
  .from('tournament_rooms')
  .upsert(payload,{onConflict:'tournament_id'});
 if(error){toast(error.message);return}
 toast('Room details saved successfully!');
 await loadData();
 state.tab='admin';
 renderContent();
}
async function createEvent(e){e.preventDefault();let f=new FormData(e.target),payload={title:f.get('title'),mode:f.get('mode'),map_name:f.get('map_name'),starts_at:f.get('starts_at')?new Date(f.get('starts_at')).toISOString():null,max_slots:Number(f.get('max_slots')),entry_fee:Number(f.get('entry_fee')),prize_pool:Number(f.get('prize_pool')),status:'open',created_by:state.user.id};let {error}=await supabase.from('tournaments').insert(payload);if(error){toast(error.message);return}toast('Tournament published.');await loadData();state.tab='admin';renderContent()}
async function toggleEvent(id,status){let {error}=await supabase.from('tournaments').update({status:status==='open'?'closed':'open'}).eq('id',id);if(error){toast(error.message);return}await loadData();state.tab='admin';renderContent()}
async function init(){
 if(supabase){supabase.auth.onAuthStateChange(()=>{setTimeout(()=>loadData(),0)});await loadData()}else{state.events=[];shell();$('#content').innerHTML='<div class="card"><h2>Setup needed</h2><p>This starter needs a Supabase project before login and shared data work.</p><p class="muted">Open SETUP.md in the downloaded ZIP and follow the steps. Do not put a service-role key in this app.</p><button class="primary" onclick="location.href=\'https://supabase.com/\'">Open Supabase</button></div>'}
}
init();
