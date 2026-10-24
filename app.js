(() => {
  const $ = id => document.getElementById(id);
  const panels = ["homePanel","roomPanel","gamePanel"];
  const topics = [
    ["ラーメン","うどん"],["犬","猫"],["海","プール"],["カレー","シチュー"],["夏","冬"],
    ["電車","バス"],["遊園地","動物園"],["寿司","焼肉"],["コーヒー","紅茶"],["山","海"],
    ["サッカー","バスケ"],["スマホ","パソコン"],["映画館","家で映画"],["学校","会社"],["パン","ご飯"]
  ];
  const avatars = ["🦊","🐼","🐸","🐙","🐻","🐯","🐧","🦄"];
  let db = null, roomRef = null, roomCode = "", playerId = sessionStorage.getItem("liarPlayerId") || "";
  if (!playerId) { playerId = "p" + Math.random().toString(36).slice(2,10); sessionStorage.setItem("liarPlayerId", playerId); }
  let roomState = null, isDemo = false, localDemo = null, toastTimer;
  const configured = window.firebaseConfig && !Object.values(window.firebaseConfig).some(v => String(v).includes("YOUR_"));
  if (configured && window.firebase && window.firebaseConfig) {
    try { firebase.initializeApp(window.firebaseConfig); db = firebase.database(); $("connectionPill").textContent = "通信準備OK"; }
    catch (e) { $("connectionPill").textContent = "設定を確認"; }
  } else { $("connectionPill").textContent = "通信未設定"; }

  function toast(msg) { const t=$("toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove("show"),2600); }
  function showPanel(id) { panels.forEach(p=>$(p).classList.toggle("hidden",p!==id)); }
  function nameValue() { return $("playerName").value.trim().slice(0,14) || "プレイヤー"; }
  function randomCode() { return String(Math.floor(1000+Math.random()*9000)); }
  function randomItem(a) { return a[Math.floor(Math.random()*a.length)]; }
  function shuffle(a) { for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a; }
  function needsFirebase() { if (!db) { toast("オンライン設定がまだです。READMEのFirebase設定を行ってください。"); return false; } return true; }
  function roomPath(code) { return db.ref("rooms/"+code); }
  function makePlayer(name) { return { id:playerId, name, avatar:randomItem(avatars), joinedAt:Date.now(), score:0 }; }

  $("showJoinBtn").onclick=()=> $("joinBox").classList.toggle("hidden");
  $("createRoomBtn").onclick=async()=>{
    if(!needsFirebase()) return;
    const code=randomCode(), player=makePlayer(nameValue());
    const initial={hostId:playerId, status:"lobby", phase:"lobby", round:1, players:{[playerId]:player}, createdAt:firebase.database.ServerValue.TIMESTAMP};
    try {
      const ref=roomPath(code); const snap=await ref.get();
      if(snap.exists()) { toast("部屋コードが重なりました。もう一度どうぞ"); return; }
      await ref.set(initial); await enterRoom(code); toast("部屋を作成しました！");
    } catch(e) { toast("部屋を作れませんでした。Firebaseの設定・ルールを確認してください。"); console.error(e); }
  };
  $("joinRoomBtn").onclick=async()=>{
    if(!needsFirebase()) return;
    const code=$("roomCodeInput").value.trim();
    if(!/^\d{4}$/.test(code)){toast("4桁の部屋コードを入力してください");return;}
    try {
      const ref=roomPath(code), snap=await ref.get();
      if(!snap.exists()){toast("その部屋は見つかりません");return;}
      const state=snap.val(), count=Object.keys(state.players||{}).length;
      if(state.status!=="lobby"){toast("この部屋はすでにゲーム中です");return;}
      if(count>=8){toast("部屋が満員です（最大8人）");return;}
      await ref.child("players/"+playerId).set(makePlayer(nameValue()));
      await enterRoom(code);
    } catch(e) { toast("参加できませんでした。Firebaseの設定・ルールを確認してください。"); console.error(e); }
  };
  async function enterRoom(code) {
    roomCode=code; isDemo=false; roomRef=roomPath(code);
    sessionStorage.setItem("liarRoomCode",code);
    roomRef.on("value",snap=>{
      roomState=snap.val();
      if(!roomState){toast("部屋が終了しました");showPanel("homePanel");return;}
      renderRoom();
      if(roomState.status==="playing") { showPanel("gamePanel"); renderGame(); }
      else showPanel("roomPanel");
    });
  }
  function renderRoom() {
    $("roomCodeLabel").textContent=roomCode;
    const players=Object.values(roomState.players||{});
    $("playerCount").textContent=`${players.length} / 8`;
    $("playerList").innerHTML="";
    players.forEach((p,i)=>{
      const li=document.createElement("li");
      li.innerHTML=`<span class="avatar">${p.avatar||avatars[i%avatars.length]}</span><span></span>${p.id===roomState.hostId?'<span class="host">HOST</span>':""}`;
      li.children[1].textContent=p.name+(p.id===playerId?"（あなた）":"");
      $("playerList").appendChild(li);
    });
    const host=roomState.hostId===playerId;
    $("startGameBtn").classList.toggle("hidden",!host);
    $("lobbyMessage").textContent=host?"全員が参加したらゲーム開始！（4人以上がおすすめ）":"ホストがゲームを開始するまで待ってね。";
  }
  $("copyCodeBtn").onclick=async()=>{try{await navigator.clipboard.writeText(roomCode);toast("部屋コードをコピーしました");}catch{toast("部屋コード："+roomCode);}};
  $("leaveRoomBtn").onclick=async()=>{if(roomRef){roomRef.off();try{await roomRef.child("players/"+playerId).remove();}catch{}}roomRef=null;roomState=null;roomCode="";showPanel("homePanel");};
  $("backToLobbyBtn").onclick=()=>{if(isDemo){showPanel("homePanel");return;} if(roomState?.status==="playing")toast("進行中のゲームです。ロビーへ戻ると観戦になります");else showPanel("roomPanel");};
  $("startGameBtn").onclick=async()=>{
    if(!roomState||roomState.hostId!==playerId)return;
    const players=Object.values(roomState.players||{});
    if(players.length<3){toast("最低3人で遊べます。4人以上がおすすめ！");return;}
    const pair=randomItem(topics), liar=randomItem(players).id;
    const assignments={};
    players.forEach(p=>assignments[p.id]={topic:p.id===liar?pair[1]:pair[0],isLiar:p.id===liar,vote:null});
    try{await roomRef.update({status:"playing",phase:"question",round:1,topicA:pair[0],topicB:pair[1],assignments,startedAt:Date.now()});}catch(e){toast("開始に失敗しました");}
  };
  function renderGame() {
    if(!roomState)return;
    const me=roomState.players?.[playerId], assignment=roomState.assignments?.[playerId];
    if(!me){$("secretTopic").textContent="観戦中";$("roleHint").textContent="このゲームには参加していません";return;}
    $("roundPill").textContent="ROUND "+(roomState.round||1);
    $("secretTopic").textContent=assignment?.topic||"お題待ち";
    $("roleHint").textContent=assignment?.isLiar?"あなたはウソつき！バレないように話そう。":"あなたは市民。みんなと同じお題を見抜こう。";
    const phase=roomState.phase;
    $("phaseLabel").textContent=phase==="question"?"質問タイム":phase==="vote"?"投票タイム":phase==="result"?"結果発表":"ゲーム中";
    $("phaseContent").innerHTML="";
    $("nextPhaseBtn").classList.add("hidden");
    if(phase==="question") {
      $("roleCard").classList.remove("hidden");
      $("phaseContent").innerHTML=`<div class="phase-box"><h3>💬 質問タイム</h3><p class="muted">お題に関係する質問を順番に出して、答えを聞こう。自分のお題は言わないでね。</p><p>おすすめ：1人ひとことずつ答えて、怪しい人を覚えておこう。</p></div>`;
      if(roomState.hostId===playerId){const b=document.createElement("button");b.className="primary";b.textContent="投票タイムへ";b.style.width="100%";b.onclick=()=>roomRef.update({phase:"vote"});$("phaseContent").appendChild(b);}
    } else if(phase==="vote") {
      $("roleCard").classList.add("hidden");
      const wrap=document.createElement("div");wrap.className="phase-box";wrap.innerHTML="<h3>🗳️ ウソつきだと思う人は？</h3><p class='muted'>1人を選んで投票。自分には投票できません。</p>";
      const list=document.createElement("div");list.className="vote-list";
      Object.values(roomState.players||{}).filter(p=>p.id!==playerId).forEach(p=>{
        const b=document.createElement("button");b.className="vote-btn";b.innerHTML=`<span>${p.avatar||"👤"} ${escapeHtml(p.name)}</span><span>投票 →</span>`;
        b.disabled=Boolean(assignment?.vote);
        b.onclick=async()=>{await roomRef.child("assignments/"+playerId+"/vote").set(p.id);toast("投票しました");};
        list.appendChild(b);
      });
      wrap.appendChild(list);
      const votes=Object.values(roomState.assignments||{}).filter(a=>a.vote).length;
      const status=document.createElement("p");status.className="muted small";status.textContent=`投票済み：${votes} / ${Object.keys(roomState.players||{}).length}`;wrap.appendChild(status);
      $("phaseContent").appendChild(wrap);
      if(roomState.hostId===playerId){const b=document.createElement("button");b.className="primary";b.style.width="100%";b.textContent="結果を発表";b.onclick=()=>roomRef.update({phase:"result"});$("phaseContent").appendChild(b);}
    } else if(phase==="result") {
      $("roleCard").classList.add("hidden");
      const players=roomState.players||{}, assignments=roomState.assignments||{}, tally={};
      Object.values(assignments).forEach(a=>{if(a.vote)tally[a.vote]=(tally[a.vote]||0)+1;});
      const max=Math.max(0,...Object.values(tally)), leaders=Object.keys(tally).filter(id=>tally[id]===max);
      const caught=leaders.length===1 && assignments[leaders[0]]?.isLiar;
      const liar=Object.values(assignments).find(a=>a.isLiar);
      const liarId=Object.keys(assignments).find(id=>assignments[id].isLiar);
      const box=document.createElement("div");box.className="phase-box";
      box.innerHTML=`<h3>🔎 結果発表</h3><div class="result">${caught?"🎉 ウソつきを見抜いた！":"😈 ウソつきの勝ち！"}<br>ウソつき：<strong>${escapeHtml(players[liarId]?.name||"不明")}</strong><br>多数派のお題：${escapeHtml(roomState.topicA||"")} ／ ウソつきのお題：${escapeHtml(roomState.topicB||"")}</div><p class="muted small">得票数：${escapeHtml(JSON.stringify(tally))}</p>`;
      $("phaseContent").appendChild(box);
      if(roomState.hostId===playerId){const b=document.createElement("button");b.className="primary";b.style.width="100%";b.textContent="もう1回遊ぶ";b.onclick=async()=>{const pair=randomItem(topics),ids=Object.keys(players),liarId2=randomItem(ids),assignments2={};ids.forEach(id=>assignments2[id]={topic:id===liarId2?pair[1]:pair[0],isLiar:id===liarId2,vote:null});await roomRef.update({phase:"question",round:(roomState.round||1)+1,topicA:pair[0],topicB:pair[1],assignments:assignments2});};$("phaseContent").appendChild(b);}
    }
  }
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

  // Local demo is intentionally single-device; it previews the rules without pretending to be online.
  $("demoBtn").onclick=()=>{
    isDemo=true; const pair=randomItem(topics); const liar=Math.random()<.5;
    localDemo={pair,liar,step:0}; showPanel("gamePanel"); $("roundPill").textContent="おためし"; $("phaseLabel").textContent="ルール確認";
    $("roleCard").classList.remove("hidden"); $("secretTopic").textContent=liar?pair[1]:pair[0]; $("roleHint").textContent=liar?"おためし役：あなたはウソつきです。":"おためし役：あなたは多数派です。";
    $("phaseContent").innerHTML=`<div class="phase-box"><h3>🎮 おためしモード</h3><p>本番では友達と同じ画面を見ながら、質問・投票を行います。</p><p class="muted">今回のお題ペアを見て、どう答えるか考えてみよう。</p><div class="topic-list"><div class="topic-option">${escapeHtml(pair[0])}</div><div class="topic-option">${escapeHtml(pair[1])}</div></div><p class="muted small">オンライン対戦はFirebase設定後に利用できます。</p></div>`;
  };
  window.addEventListener("beforeunload",()=>{if(roomRef)roomRef.off();});
})();
