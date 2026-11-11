(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const ui = {
    overlay: $('overlay'), intro: $('intro-dialog'), stop: $('stop-dialog'), end: $('end-dialog'),
    start: $('start-button'), restart: $('restart-button'), continue: $('continue-button'), choices: $('choice-grid'),
    toast: $('toast'), banner: $('phase-banner'), hint: $('drive-hint'), tip: $('mobile-tip'),
    armorFill: $('armor-fill'), armor: $('armor-value'), fuelFill: $('fuel-fill'), fuel: $('fuel-value'),
    scrap: $('scrap-value'), kills: $('kill-value'), weapon: $('weapon-name'), weaponDetail: $('weapon-detail'),
    route: $('route-fill'), stopLabel: $('stop-label'), routeLabel: $('route-label'), ammo: $('ammo-label'),
    flash: $('screen-flash'), sound: $('sound-button')
  };
  const rand = (a,b) => a + Math.random()*(b-a);
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  const weapons = [
    {name:'SCRAP RIFLE', icon:'⌁', rate:.47, damage:1, speed:620, detail:'BURST'},
    {name:'ROAD RIPPER', icon:'ϟ', rate:.31, damage:1.55, speed:730, detail:'RAPID FIRE'},
    {name:'THUNDER-12', icon:'✦', rate:.67, damage:3.2, speed:540, detail:'HEAVY SLUG'}
  ];
  const stopNames = ['DUSTY JUNCTION','MILE ZERO','THE GATEHOUSE','CINDER FLATS','LAST CHANCE','IRON HAVEN','NORTH PASS','NEW HAVEN'];
  let W=0,H=0,dpr=1,last=0,mode='intro',soundOn=false,audio=null,toastTimer=0, bannerTimer=0, globalTime=0;
  let state, keys={}, pointer={x:0,y:0,active:false}, bgSeed=1;

  function newGame(){
    state={stop:1,progress:0,armor:100,maxArmor:100,fuel:100,scrap:25,kills:0,totalScrap:25,weapon:0,weaponLevel:1,turret:0,playerY:.69,boost:false,fire:false,enemies:[],bullets:[],particles:[],decor:[],spawnClock:.5,shotClock:0,damageClock:0,haul:0,selected:null,baseTime:0,baseKills:0,baseHits:0,totalStops:0,runTime:0,visualDistance:0};
    buildDecor(); updateHud();
  }
  function resize(){
    const r=canvas.getBoundingClientRect(); dpr=Math.min(window.devicePixelRatio||1,2);
    W=Math.max(1,r.width);H=Math.max(1,r.height);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);buildDecor();
  }
  function buildDecor(){
    if(!W||!H)return; state && (state.decor=[]);
    if(!state)return;
    for(let i=0;i<34;i++) state.decor.push({x:rand(0,W),y:rand(H*.26,H*.61),w:rand(18,70),h:rand(18,H*.15),type:Math.floor(rand(0,5)),parallax:rand(.16,.75),seed:Math.random()});
  }
  function setMode(next){mode=next;ui.overlay.classList.toggle('hidden',!['intro','stop','end'].includes(mode));ui.intro.classList.toggle('hidden',mode!=='intro');ui.stop.classList.toggle('hidden',mode!=='stop');ui.end.classList.toggle('hidden',mode!=='end');ui.hint.style.opacity=mode==='drive'?'1':'0';ui.tip.style.opacity=['drive','base'].includes(mode)?'1':'0';ui.banner.classList.toggle('visible',mode==='base');}
  function toast(text){ui.toast.textContent=text;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),1550);}
  function ping(freq=460,duration=.08,type='sine'){
    if(!soundOn)return;try{audio ||= new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.055,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration)}catch(e){}
  }
  function updateHud(){
    ui.armorFill.style.width=`${clamp(state.armor/state.maxArmor*100,0,100)}%`;ui.armor.textContent=Math.ceil(state.armor);
    ui.fuelFill.style.width=`${clamp(state.fuel,0,100)}%`;ui.fuel.textContent=Math.ceil(state.fuel);
    ui.scrap.textContent=String(Math.floor(state.scrap)).padStart(3,'0');ui.kills.textContent=String(state.kills).padStart(2,'0');
    const weapon=weapons[state.weapon];ui.weapon.textContent=weapon.name;ui.weaponDetail.textContent=`${weapon.detail} • LV ${state.weaponLevel}`;
    ui.route.style.width=`${(state.stop-1+state.progress)/8*100}%`;ui.stopLabel.textContent=`STOP ${String(Math.min(state.stop,8)).padStart(2,'0')} / 08`;
    ui.routeLabel.textContent=state.stop>=7?'NORTH PASS':'HIGHWAY 09';
    ui.ammo.textContent=state.weapon===2?'SHELLS':'∞';
  }
  function startRun(){newGame();setMode('drive');bannerTimer=3.4;ui.banner.classList.add('visible');setTimeout(()=>{if(mode==='drive')ui.banner.classList.remove('visible')},3000);ping(180,.2,'sawtooth');}
  function addParticle(x,y,color,n=5){for(let i=0;i<n;i++)state.particles.push({x,y,vx:rand(-115,115),vy:rand(-145,40),life:rand(.22,.65),max:.65,color,size:rand(2,5)});}
  function spawnEnemy(){
    const base=mode==='base';const tough=Math.random()<.19;state.enemies.push({x:W+rand(20,100),y:rand(H*.55,H*.76),lane:rand(-.08,.08),hp:tough?2:1,maxHp:tough?2:1,speed:rand(48,85)*(tough?.82:1)*(base?1.12:1),size:rand(.83,1.12),type:Math.floor(rand(0,4)),sway:rand(0,6),hit:0});
  }
  function shoot(){
    if(state.shotClock>0)return;
    let target=null,best=Infinity;
    for(const z of state.enemies){const d=Math.hypot(z.x-W*.24,z.y-H*state.playerY);if(d<best){best=d;target=z}}
    if(!target){if(pointer.active){target={x:pointer.x,y:pointer.y}}else return;}
    const ox=W*.235,oy=H*state.playerY-H*.12,dx=target.x-ox,dy=target.y-oy,len=Math.hypot(dx,dy)||1,w=weapons[state.weapon];
    state.bullets.push({x:ox,y:oy,vx:dx/len*w.speed,vy:dy/len*w.speed,damage:w.damage+(state.weaponLevel-1)*.35,life:1.5,size:state.weapon===2?4:2.5});
    state.shotClock=w.rate;ping(state.weapon===2?125:390,.055,state.weapon===2?'square':'triangle');
    addParticle(ox,oy,'#ffd77b',2);
  }
  function killEnemy(z){
    state.kills++;state.scrap+=2;state.totalScrap+=2;state.baseKills++;addParticle(z.x,z.y,'#9b7955',10);ping(190,.08,'sawtooth');
    const i=state.enemies.indexOf(z);if(i>=0)state.enemies.splice(i,1);
  }
  function damage(amount){
    state.armor=Math.max(0,state.armor-amount);state.damageClock=.85;ui.flash.classList.remove('hit');void ui.flash.offsetWidth;ui.flash.classList.add('hit');ping(80,.15,'sawtooth');updateHud();
    if(state.armor<=0){finish(false);}
  }
  function driveTick(dt){
    state.runTime+=dt;state.shotClock=Math.max(0,state.shotClock-dt);state.damageClock=Math.max(0,state.damageClock-dt);
    const boost=state.boost&&state.fuel>0;const speed=state.fuel<=0?.035:(boost?.135:.075);
    state.progress+=dt*speed;state.visualDistance+=dt*(boost?270:155);state.fuel=Math.max(0,state.fuel-dt*(boost?1.25:.23));
    const desired=clamp(state.playerY+((keys.ArrowUp||keys.KeyW?-1:0)+(keys.ArrowDown||keys.KeyS?1:0))*dt*.62,.53,.78);
    state.playerY+=(desired-state.playerY)*Math.min(1,dt*5);
    state.spawnClock-=dt;if(state.spawnClock<=0){spawnEnemy();state.spawnClock=rand(.72,1.35)}
    if(state.fire)shoot();
    updateCombat(dt,false);updateHud();
    if(state.progress>=1){arriveStop()}
  }
  function baseTick(dt){
    state.runTime+=dt;state.baseTime-=dt;state.shotClock=Math.max(0,state.shotClock-dt);state.damageClock=Math.max(0,state.damageClock-dt);
    state.spawnClock-=dt;if(state.spawnClock<=0){spawnEnemy();state.spawnClock=rand(.53,.91)}
    if(state.fire)shoot();
    if(state.turret>0&&state.enemies.length){state.turretClock=(state.turretClock||0)-dt;if(state.turretClock<=0){const t=state.enemies[0];t.hp-=1;state.turretClock=.68;addParticle(t.x,t.y,'#f3c65e',3);if(t.hp<=0)killEnemy(t)}}
    updateCombat(dt,true);updateHud();
    if(state.baseTime<=0){state.enemies=[];state.bullets=[];toast('OUTPOST SECURE • +30 SCRAP');state.scrap+=30;state.totalScrap+=30;updateHud();setTimeout(()=>{if(mode==='base'){state.stop++;state.progress=0;setMode('drive');ui.banner.classList.remove('visible');toast('BACK ON THE ROAD');}},1100)}
  }
  function updateCombat(dt,base){
    for(let i=state.bullets.length-1;i>=0;i--){const b=state.bullets[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
      let hit=null;for(const z of state.enemies){if(Math.hypot(b.x-z.x,b.y-z.y)<20*z.size){hit=z;break}}
      if(hit){hit.hp-=b.damage;hit.hit=.12;addParticle(b.x,b.y,'#ffb866',4);state.bullets.splice(i,1);if(hit.hp<=0)killEnemy(hit);continue}
      if(b.life<=0||b.x>W+30||b.y<-30||b.y>H+30)state.bullets.splice(i,1);
    }
    for(const z of [...state.enemies]){
      z.hit=Math.max(0,z.hit-dt);z.x-=z.speed*dt;z.y+=Math.sin(globalTime*3+z.sway)*dt*11;
      if(z.x<W*.25+50){if(state.damageClock<=0){damage(base?9:7);state.damageClock=base?1.0:.82}state.enemies.splice(state.enemies.indexOf(z),1);addParticle(W*.25,H*state.playerY,'#e87858',5)}
    }
    for(let i=state.particles.length-1;i>=0;i--){const p=state.particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=250*dt;p.life-=dt;if(p.life<=0)state.particles.splice(i,1)}
  }

  function arriveStop(){
    state.progress=1;state.totalStops++;state.haul=16+Math.floor(rand(4,13));state.scrap+=state.haul;state.totalScrap+=state.haul;state.enemies=[];state.bullets=[];state.fire=false;state.boost=false;updateHud();
    if(state.stop>=8){finish(true);return}
    if(state.stop===3||state.stop===6){$('stop-title').textContent=stopNames[state.stop-1];$('stop-sub').textContent='A fortified outpost. Patch up before the horde finds you.'}else{$('stop-title').textContent=stopNames[state.stop-1];$('stop-sub').textContent='A roadside outpost. Pick your next move.'}
    $('haul-value').textContent=state.haul;$('threat-value').textContent=state.stop>=6?'HIGH':state.stop>=3?'MED':'LOW';state.selected=null;populateChoices();setMode('stop');ping(520,.16,'triangle');
  }
  function populateChoices(){
    const base=state.stop===3||state.stop===6;
    const pool=[
      {icon:'✚',name:'PATCH THE RIG',desc:'Restore 32 armor. Keep this ride alive.',cost:18,act:()=>{const gained=Math.min(32,state.maxArmor-state.armor);state.armor+=gained;toast(`+${gained} ARMOR`)}},
      {icon:'ϟ',name:'TUNE WEAPON',desc:state.weaponLevel<3?'More punch. +1 weapon level.':'Scrap rifle has reached max level.',cost:26,act:()=>{if(state.weaponLevel<3){state.weaponLevel++;toast('WEAPON POWER UP')}else toast('ALREADY MAXED')}},
      {icon:'⌖',name:'SCAVENGE',desc:'Quick sweep. Take 22 scrap and roll out.',cost:0,act:()=>{state.scrap+=22;state.totalScrap+=22;toast('+22 SCRAP')}},
      {icon:'⬟',name:'ARMOR PLATE',desc:'Bolt on a plate. +18 max armor and repair.',cost:30,act:()=>{state.maxArmor+=18;state.armor=Math.min(state.maxArmor,state.armor+28);toast('ARMOR PLATING INSTALLED')}},
      {icon:'▤',name:'WEAPON CACHE',desc:'Trade up to a heavier gun. Rifle → Ripper → Thunder-12.',cost:38,act:()=>{state.weapon=(state.weapon+1)%weapons.length;state.weaponLevel=1;toast(`${weapons[state.weapon].name} EQUIPPED`)}},
      {icon:'⚙',name:'TURRET KIT',desc:state.turret<3?'Auto-fire during outpost defense.':'Turret array is maxed out.',cost:24,act:()=>{if(state.turret<3){state.turret++;toast('OUTPOST TURRET INSTALLED')}else toast('TURRET ARRAY MAXED')}}
    ];
    const chosen=base?[pool[0],pool[2],pool[5]]:[pool[0],pool[1],pool[2]];
    ui.choices.innerHTML='';chosen.forEach((c,i)=>{const card=document.createElement('button');card.className='choice-card';card.innerHTML=`<span class="choice-icon">${c.icon}</span><b>${c.name}</b><small>${c.desc}</small><span class="cost">${c.cost?`▣ ${c.cost}`:'FREE'}</span>`;card.addEventListener('click',()=>{
      if(state.selected!==null)return;if(state.scrap<c.cost){toast('NOT ENOUGH SCRAP');ping(100,.1,'square');return}
      if(c.name==='TUNE WEAPON'&&state.weaponLevel>=3||c.name==='TURRET KIT'&&state.turret>=3){toast('ALREADY MAXED');return}
      state.scrap-=c.cost;c.act();state.selected=i;card.classList.add('selected');[...ui.choices.children].forEach((el,j)=>{if(j!==i)el.style.opacity='.45'});updateHud();ping(600,.08,'sine');
    });ui.choices.appendChild(card)});
  }
  function leaveStop(){
    if(state.selected===null){toast('CHOOSE ONE ROAD HAUL FIRST');return}
    if(state.stop===3||state.stop===6){state.baseTime=17;state.baseKills=0;state.spawnClock=.25;state.damageClock=.35;setMode('base');$('phase-banner').querySelector('small').textContent='OUTPOST DEFENSE';$('phase-banner').querySelector('b').textContent='HOLD THE LINE';ui.banner.classList.add('visible');toast('DEFEND THE OUTPOST • SURVIVE 17 SEC');ping(150,.3,'sawtooth')}
    else{state.stop++;state.progress=0;state.spawnClock=.6;setMode('drive');toast('BACK ON THE LONG ROAD');}
    updateHud();
  }
  function finish(won){
    if(mode==='end')return;state.fire=false;state.boost=false;setMode('end');
    $('end-title').textContent=won?'YOU MADE IT.':'THE ROAD TAKES ALL.';$('end-copy').textContent=won?'New Haven is still standing. For now.':'Your ride is scrap. The road keeps going.';
    $('end-kills').textContent=state.kills;$('end-stops').textContent=`${won?8:Math.min(state.totalStops,8)}/8`;$('end-scrap').textContent=state.totalScrap;
  }
  function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
  function drawBackground(dt){
    const horizon=H*.57, roadY=H*.67;
    let sky=ctx.createLinearGradient(0,0,0,horizon);sky.addColorStop(0,'#64726d');sky.addColorStop(.58,'#b17f5d');sky.addColorStop(1,'#e1a56e');ctx.fillStyle=sky;ctx.fillRect(0,0,W,horizon+2);
    // dust haze and low sun
    ctx.fillStyle='rgba(249,194,124,.72)';ctx.beginPath();ctx.arc(W*.77,H*.28,Math.min(W,H)*.072,0,Math.PI*2);ctx.fill();
    const hillOffset=(state.visualDistance*.055)%W;
    for(let layer=0;layer<3;layer++){
      ctx.beginPath();ctx.moveTo(0,horizon);for(let x=0;x<=W+10;x+=12){const n=Math.sin((x+hillOffset*(layer+1)*.5)*(.006+layer*.003))*H*(.022+layer*.012)+Math.sin(x*.017+layer*7)*H*.012;ctx.lineTo(x,horizon-H*(.07+layer*.025)+n)}ctx.lineTo(W,horizon);ctx.closePath();ctx.fillStyle=['#7b7662','#696b59','#555f51'][layer];ctx.fill();
    }
    // distant ruined skyline
    for(const d of state.decor){let x=(d.x-state.visualDistance*d.parallax*.28)%(W+120);if(x< -100)x+=W+120;const y=horizon-d.h*.8;
      if(d.type===0||d.type===1){ctx.fillStyle=d.type?'#53594e':'#656455';ctx.fillRect(x,y,d.w,d.h);ctx.fillStyle='rgba(27,34,30,.4)';for(let wx=x+6;wx<x+d.w-4;wx+=12)for(let wy=y+7;wy<y+d.h-5;wy+=13)if((wx+wy+d.seed*10)%3>1)ctx.fillRect(wx,wy,4,6);if(d.type===1){ctx.fillStyle='#414941';ctx.fillRect(x+d.w*.5-2,y-14,4,14)}}
      else if(d.type===2){ctx.strokeStyle='#464d43';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y+d.h);ctx.lineTo(x+d.w*.45,y);ctx.lineTo(x+d.w,y+d.h);ctx.stroke();ctx.beginPath();ctx.moveTo(x+d.w*.45,y);ctx.lineTo(x+d.w*.55,y+d.h*.65);ctx.stroke()}
      else{ctx.fillStyle='#58614f';ctx.fillRect(x+d.w*.42,y+d.h*.35,5,d.h*.65);ctx.beginPath();ctx.arc(x+d.w*.44,y+d.h*.28,d.w*.32,0,Math.PI*2);ctx.fill()}
    }
    // terrain
    const earth=ctx.createLinearGradient(0,horizon,0,H);earth.addColorStop(0,'#777052');earth.addColorStop(.45,'#655a42');earth.addColorStop(1,'#3b4036');ctx.fillStyle=earth;ctx.fillRect(0,horizon,W,H-horizon);
    // roadside grass and wreck debris
    for(let i=0;i<30;i++){const x=((i*97-state.visualDistance*.65)%(W+60)+W+60)%(W+60)-30;const y=H*.59+(i%6)*H*.012;ctx.strokeStyle=i%2?'#8f865c':'#a27650';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y+8);ctx.lineTo(x-3,y);ctx.moveTo(x,y+8);ctx.lineTo(x+4,y-2);ctx.stroke();}
    // asphalt
    ctx.fillStyle='#383d3a';ctx.fillRect(0,roadY,W,H*.27);const roadGrad=ctx.createLinearGradient(0,roadY,0,H);roadGrad.addColorStop(0,'#454743');roadGrad.addColorStop(1,'#252c2a');ctx.fillStyle=roadGrad;ctx.fillRect(0,roadY,W,H*.27);
    ctx.fillStyle='#b9a875';ctx.fillRect(0,roadY,W,3);ctx.fillStyle='rgba(233,214,162,.45)';let dash=(state.visualDistance*1.25)%(W*.2);ctx.fillStyle='#c5b88a';for(let x=-W*.2-dash;x<W;x+=W*.2)ctx.fillRect(x,roadY+H*.17,W*.095,3);
    ctx.fillStyle='rgba(8,12,11,.4)';ctx.fillRect(0,H*.94,W,H*.06);
    // road signage flashes by
    const signX=W-((state.visualDistance*.55)%(W+90));if(signX>W*.55){ctx.fillStyle='#4b4c3b';ctx.fillRect(signX,H*.48,5,H*.14);ctx.fillStyle='#83744f';roundRect(signX-28,H*.47,62,24,2);ctx.fill();ctx.fillStyle='#e2d4a9';ctx.font=`${Math.max(7,H*.013)}px DM Mono`;ctx.fillText('MILE '+String(state.stop*13).padStart(2,'0'),signX-22,H*.487+10)}
  }
  function drawCar(){
    const x=W*.235,y=H*state.playerY,scale=clamp(H/520,.68,1.3);ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    // shadow
    ctx.fillStyle='rgba(0,0,0,.42)';ctx.beginPath();ctx.ellipse(6,16,92,17,0,0,Math.PI*2);ctx.fill();
    // suspension and frame
    ctx.fillStyle='#222522';roundRect(-73,-24,145,35,7);ctx.fill();
    // armored body
    ctx.fillStyle='#a65337';ctx.beginPath();ctx.moveTo(-92,-17);ctx.lineTo(-76,-35);ctx.lineTo(-44,-43);ctx.lineTo(-23,-62);ctx.lineTo(29,-59);ctx.lineTo(52,-40);ctx.lineTo(82,-33);ctx.lineTo(93,-15);ctx.lineTo(88,3);ctx.lineTo(-91,3);ctx.closePath();ctx.fill();
    ctx.fillStyle='#cd7044';ctx.beginPath();ctx.moveTo(-66,-35);ctx.lineTo(-39,-42);ctx.lineTo(-22,-58);ctx.lineTo(23,-55);ctx.lineTo(43,-39);ctx.closePath();ctx.fill();
    // windows
    ctx.fillStyle='#344542';ctx.beginPath();ctx.moveTo(-34,-43);ctx.lineTo(-18,-56);ctx.lineTo(2,-55);ctx.lineTo(2,-40);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(9,-55);ctx.lineTo(21,-54);ctx.lineTo(37,-40);ctx.lineTo(9,-40);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#d4935b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(5,-57);ctx.lineTo(5,-39);ctx.stroke();
    // bumpers and grille
    ctx.fillStyle='#292d29';ctx.fillRect(-94,-12,16,8);ctx.fillRect(82,-13,17,8);ctx.fillStyle='#e4c47d';ctx.fillRect(80,-27,8,7);ctx.fillStyle='#211f1a';ctx.fillRect(50,-28,17,9);for(let i=0;i<4;i++){ctx.fillStyle='#6d7268';ctx.fillRect(51+i*4,-27,2,7)}
    // armor plating and spikes
    ctx.fillStyle='#6a4934';ctx.fillRect(-76,-32,23,11);ctx.fillRect(26,-38,30,8);ctx.fillStyle='#d19a52';for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(-68+i*8,-32);ctx.lineTo(-65+i*8,-42);ctx.lineTo(-61+i*8,-32);ctx.fill()}
    // roof rack and mounted gun
    ctx.strokeStyle='#34372e';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-25,-61);ctx.lineTo(-20,-69);ctx.lineTo(29,-68);ctx.lineTo(36,-58);ctx.stroke();
    ctx.fillStyle='#3d4039';roundRect(-5,-75,38,10,3);ctx.fill();ctx.fillStyle='#272b27';ctx.fillRect(17,-73,34,4);ctx.fillStyle='#cf9d56';ctx.fillRect(47,-74,9,6);
    // wheel wells + animated wheels
    for(const wx of [-58,57]){ctx.fillStyle='#171b19';ctx.beginPath();ctx.arc(wx,0,19,0,Math.PI*2);ctx.fill();ctx.fillStyle='#747367';ctx.beginPath();ctx.arc(wx,0,10,0,Math.PI*2);ctx.fill();ctx.fillStyle='#2c312d';ctx.beginPath();ctx.arc(wx,0,5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ada181';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(wx-7,0);ctx.lineTo(wx+7,0);ctx.moveTo(wx,-7);ctx.lineTo(wx,7);ctx.stroke()}
    // exhaust flame under boost
    if(state.boost&&state.fuel>0){ctx.fillStyle='#f2b34e';ctx.beginPath();ctx.moveTo(-89,-11);ctx.lineTo(-109,-4+Math.sin(globalTime*30)*4);ctx.lineTo(-88,-1);ctx.fill();ctx.fillStyle='#f9e2a2';ctx.beginPath();ctx.moveTo(-89,-9);ctx.lineTo(-101,-5);ctx.lineTo(-89,-4);ctx.fill()}
    ctx.restore();
  }

  function drawZombie(z){
    const s=clamp(H/520,.68,1.3)*z.size;ctx.save();ctx.translate(z.x,z.y);ctx.scale(s,s);ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(0,12,15,5,0,0,Math.PI*2);ctx.fill();
    const skin=['#78816a','#9a8064','#65745e','#a18e6b'][z.type];const bob=Math.sin(globalTime*8+z.sway)*2;
    ctx.strokeStyle='#353b31';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-4,1+bob);ctx.lineTo(-8,10+bob);ctx.lineTo(-12,13+bob);ctx.moveTo(5,1+bob);ctx.lineTo(9,8+bob);ctx.lineTo(14,9+bob);ctx.stroke();
    ctx.fillStyle=skin;ctx.beginPath();ctx.ellipse(0,-7+bob,9,13,.08,0,Math.PI*2);ctx.fill();ctx.fillStyle=skin;ctx.beginPath();ctx.arc(2,-23+bob,8,0,Math.PI*2);ctx.fill();
    // torn coat and dangling arms
    ctx.fillStyle=['#545c4b','#60463b','#4a5148','#756247'][z.type];ctx.beginPath();ctx.moveTo(-7,-16+bob);ctx.lineTo(8,-16+bob);ctx.lineTo(11,2+bob);ctx.lineTo(3,0+bob);ctx.lineTo(-1,4+bob);ctx.lineTo(-7,1+bob);ctx.closePath();ctx.fill();
    ctx.strokeStyle=skin;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-6,-12+bob);ctx.lineTo(-13,-3+bob);ctx.lineTo(-16,1+bob);ctx.moveTo(7,-12+bob);ctx.lineTo(13,-6+bob);ctx.lineTo(16,-11+bob);ctx.stroke();
    ctx.fillStyle='#e77857';ctx.fillRect(-1,-25+bob,3,2);ctx.fillRect(4,-25+bob,3,2);if(z.maxHp>1){ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(-10,-40,20,3);ctx.fillStyle='#e87958';ctx.fillRect(-10,-40,20*(z.hp/z.maxHp),3)}
    if(z.hit>0){ctx.strokeStyle='rgba(255,235,180,.8)';ctx.lineWidth=2;ctx.strokeRect(-11,-37,22,47)}ctx.restore();
  }
  function drawBullets(){
    for(const b of state.bullets){ctx.save();ctx.strokeStyle=state.weapon===2?'#ff8b54':'#f6d174';ctx.lineWidth=b.size*1.5;ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=10;ctx.beginPath();ctx.moveTo(b.x-b.vx*.018,b.y-b.vy*.018);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore()}
    for(const p of state.particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}
  }
  function drawBase(){
    if(mode!=='base')return;
    const x=W*.75,y=H*.49;ctx.save();ctx.translate(x,y);ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(-24,43,48,8);
    // barricade and improvised lookout
    ctx.fillStyle='#554631';ctx.fillRect(-18,10,37,35);ctx.fillStyle='#89714a';for(let i=0;i<5;i++){ctx.fillRect(-18+i*8,12,5,31);ctx.fillStyle='#ba9660';ctx.fillRect(-22+i*9,8,8,5);ctx.fillStyle='#89714a'}
    ctx.strokeStyle='#4b4334';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-29,44);ctx.lineTo(25,4);ctx.moveTo(-25,7);ctx.lineTo(28,44);ctx.stroke();
    // watchtower silhouette
    ctx.fillStyle='#403c30';ctx.fillRect(-9,-42,18,47);ctx.fillRect(-22,-45,44,5);ctx.fillStyle='#d2a35a';ctx.fillRect(-4,-36,8,8);ctx.fillStyle='#8c7750';ctx.fillRect(-14,-49,28,5);
    if(state.turret){ctx.fillStyle='#363c36';ctx.fillRect(14,-16,30,10);ctx.fillStyle='#d1a355';ctx.fillRect(40,-13,13,4);ctx.fillStyle='#222';ctx.beginPath();ctx.arc(19,-4,5,0,Math.PI*2);ctx.arc(37,-4,5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f0cb69';ctx.font='9px DM Mono';ctx.fillText('×'+state.turret,20,-21)}
    ctx.restore();
    // base timer visual at ground
    const barW=Math.min(210,W*.35), ratio=clamp(state.baseTime/17,0,1);ctx.fillStyle='rgba(12,17,14,.62)';roundRect(W*.5-barW/2,H*.88,barW,6,3);ctx.fill();ctx.fillStyle='#e8a263';roundRect(W*.5-barW/2,H*.88,barW*ratio,6,3);ctx.fill();ctx.fillStyle='#e9e2d1';ctx.font=`500 ${Math.max(8,H*.014)}px DM Mono`;ctx.textAlign='center';ctx.fillText(`OUTPOST UNDER ATTACK  •  ${Math.max(0,Math.ceil(state.baseTime))} SEC`,W*.5,H*.88-8);ctx.textAlign='left';
  }
  function draw(){
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);drawBackground(0);
    // foreground details blur by in the road
    for(let i=0;i<12;i++){const x=((i*173-state.visualDistance*1.5)%(W+80)+W+80)%(W+80)-40;const y=H*.89+(i%3)*H*.025;ctx.fillStyle='rgba(21,26,23,.4)';ctx.beginPath();ctx.ellipse(x,y,rand(3,12),2,0,0,Math.PI*2);ctx.fill()}
    for(const z of state.enemies)drawZombie(z);drawCar();drawBase();drawBullets();
    // aim pip on desktop while firing pointer
    if(pointer.active&&state.fire&&mode==='drive'){ctx.strokeStyle='rgba(255,223,142,.75)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(pointer.x,pointer.y,8,0,Math.PI*2);ctx.moveTo(pointer.x-12,pointer.y);ctx.lineTo(pointer.x+12,pointer.y);ctx.moveTo(pointer.x,pointer.y-12);ctx.lineTo(pointer.x,pointer.y+12);ctx.stroke()}
  }
  function frame(now){
    const dt=Math.min(.04,(now-last)/1000||0);last=now;globalTime=now/1000;
    if(mode==='drive')driveTick(dt);else if(mode==='base')baseTick(dt);
    draw();requestAnimationFrame(frame);
  }
  function actionOn(action,on){if(action==='fire')state.fire=on;if(action==='boost')state.boost=on;if(action==='up'){keys.ArrowUp=on}if(action==='down'){keys.ArrowDown=on}}
  function pointerPos(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
  document.querySelectorAll('[data-action]').forEach(btn=>{
    const action=btn.dataset.action;btn.addEventListener('pointerdown',e=>{e.preventDefault();btn.setPointerCapture?.(e.pointerId);btn.classList.add('active');actionOn(action,true)});
    const off=e=>{if(e)e.preventDefault();btn.classList.remove('active');actionOn(action,false)};btn.addEventListener('pointerup',off);btn.addEventListener('pointercancel',off);btn.addEventListener('lostpointercapture',off);btn.addEventListener('contextmenu',e=>e.preventDefault());
  });
  canvas.addEventListener('pointermove',e=>{const p=pointerPos(e);pointer.x=p.x;pointer.y=p.y;if(e.pointerType==='mouse')pointer.active=true});
  canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&mode==='drive'){pointer.active=true;state.fire=true;canvas.setPointerCapture(e.pointerId)}});
  canvas.addEventListener('pointerup',e=>{if(e.pointerType==='mouse'){state.fire=false;pointer.active=false}});
  window.addEventListener('keydown',e=>{keys[e.code]=true;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();if(e.code==='Space'){state.fire=true}if(e.code==='ShiftLeft'||e.code==='ShiftRight')state.boost=true});
  window.addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='Space')state.fire=false;if(e.code==='ShiftLeft'||e.code==='ShiftRight')state.boost=false});
  window.addEventListener('blur',()=>{keys={};if(state){state.fire=false;state.boost=false}});
  ui.start.addEventListener('click',startRun);ui.restart.addEventListener('click',startRun);ui.continue.addEventListener('click',leaveStop);
  ui.sound.addEventListener('click',()=>{soundOn=!soundOn;ui.sound.style.opacity=soundOn?'1':'.55';ui.sound.innerHTML=soundOn?'♫ <span>SOUND ON</span>':'♫ <span>SOUND</span>';if(soundOn)ping(520,.08)});
  window.addEventListener('resize',resize);newGame();resize();setMode('intro');requestAnimationFrame(frame);
})();
