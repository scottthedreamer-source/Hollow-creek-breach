// Run with Node and Playwright available: node tests/smoke.cjs
// Uses system Chromium or CHROMIUM_PATH; serves the checkout locally.
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
(async()=>{
 const server=spawn('python3',['-m','http.server','8769','--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});
 let browser;
 try{
  await new Promise(r=>setTimeout(r,450));
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  for(const map of (process.env.SMOKE_MAP?[process.env.SMOKE_MAP]:['farmhouse','depot','annex']))for(const gfx of (process.env.SMOKE_GFX?[Number(process.env.SMOKE_GFX)]:[0,6])){
   const page=await browser.newPage({viewport:{width:1280,height:800}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/index.html?*',async route=>{
    let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
    // Test-only instrumentation. Production exposes no debugging/cheat API.
    html=html.replace('requestAnimationFrame(frame);\n})();',`window.testGame={G,P,WPN,PAD,MAP,SET,SPAWNS,ROOMS,colliders,scene,camera,renderer,loadouts:LOADOUTS,get bots(){return bots},get error(){return runErr},setDiff,setLoadout,startGame,toMenu,resetLevel,pollPad,fire,shootRay,updateWeapon,finishReload,collide,simulate};\nrequestAnimationFrame(frame);\n})();`);
    await route.fulfill({contentType:'text/html',body:html});
   });
   await page.addInitScript(()=>{
    window.pad={id:'Test Xbox Controller',mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
    navigator.getGamepads=()=>[window.pad];
   });
   await page.goto(`http://127.0.0.1:8769/index.html?map=${map}&gfx=${gfx}`);
   await page.waitForFunction(()=>!!window.testGame,{timeout:30000});
   await page.waitForTimeout(150);
   assert.deepEqual(errors,[],map+' startup');
   assert.equal(await page.locator('.choice').count(),6);
   await page.evaluate(()=>{testGame.setDiff('veteran');testGame.resetLevel()});
   const init=await page.evaluate(()=>({count:testGame.bots.length,invalid:testGame.bots.filter(b=>testGame.collide(b.pos.x,b.pos.z,.2,b.pos.y+.02,b.pos.y+1.7)).map(b=>b.s.id),error:testGame.error?.message,upper:document.getElementById('upperPlan').hidden}));
   assert.equal(init.count,15);assert.deepEqual(init.invalid,[],`${map}: bot spawn collision`);assert.equal(init.error,undefined);
   assert.equal(init.upper,map!=='farmhouse');
   if(map!=='farmhouse'){
    const unreachable=await page.evaluate(()=>{
     const t=testGame;const bars=t.colliders.filter(c=>c.surf==='wood'&&c.x1-c.x0<.13||c.surf==='wood'&&c.z1-c.z0<.13);const old=bars.map(c=>c.dead);bars.forEach(c=>c.dead=true);
     const queue=[[13,13]],seen=new Set(['26,26']);
     for(let q=0;q<queue.length;q++){const [x,z]=queue[q];for(const [dx,dz] of [[.5,0],[-.5,0],[0,.5],[0,-.5]]){const a=x+dx,b=z+dz,key=`${a*2},${b*2}`;if(a<.5||a>25.5||b<.5||b>13||seen.has(key)||t.collide(a,b,.3,.02,1.8))continue;seen.add(key);queue.push([a,b]);}}
     bars.forEach((c,i)=>c.dead=old[i]);
     return t.bots.filter(bot=>!queue.some(([x,z])=>Math.hypot(x-bot.pos.x,z-bot.pos.z)<.8)).map(b=>b.s.id);
    });assert.deepEqual(unreachable,[],map+' reachable bot positions after breaching');
   }
   for(const [kit,mag,auto] of [['entry',40,true],['marksman',20,false],['assault',30,true]]){
    const w=await page.evaluate(k=>{testGame.setLoadout(k);testGame.startGame(true);testGame.G.paused=true;return {mag:testGame.WPN.rifle.mag,cur:testGame.WPN.rifle.cur,auto:testGame.WPN.rifle.auto,mode:testGame.P.mode}},kit);
    assert.equal(w.mag,mag);assert.equal(w.cur,mag);assert.equal(w.auto,auto);assert.equal(w.mode,auto?'auto':'single');
   }
   // Frame-independent gamepad edges against the real controller handler.
   const result=await page.evaluate(()=>{
    const t=testGame;t.G.paused=false;
    function press(i){window.pad.buttons[i]={pressed:true,value:1};t.pollPad(.016);window.pad.buttons[i]={pressed:false,value:0};t.pollPad(.016)}
    press(4);const crouch=t.P.crouch;
    press(10);const left=t.PAD.leanDir;press(10);const neutral=t.PAD.leanDir;press(11);const right=t.PAD.leanDir;
    press(3);const pistol=t.P.w;t.P.switchT=0;press(3);const primary=t.P.w;t.P.switchT=0;
    window.pad.buttons[7]={pressed:true,value:1};t.pollPad(.016);t.updateWeapon(.016);const shots=t.G.shots;window.pad.buttons[7]={pressed:false,value:0};t.pollPad(.016);
    t.P.fireCd=0;t.WPN.rifle.cur=8;press(2);const reload=t.P.reloadT>0;t.updateWeapon(4);const refilled=t.WPN.rifle.cur;
    // Trace an unobstructed bullet directly into an actual bot hitbox.
    const b=t.bots[0];b.sync(0,0);t.scene.updateMatrixWorld(true);const target=b.eye().clone().add(new THREE.Vector3(0,-.05,0));t.shootRay(target.clone().add(new THREE.Vector3(0,0,-.6)),new THREE.Vector3(0,0,1),t.WPN.rifle);
    const hit=b.hp<100;
    press(9);const paused=t.G.paused;
    t.toMenu();window.pad.connected=false;t.pollPad(.016);window.pad.connected=true;t.pollPad(.016);
    return {crouch,left,neutral,right,pistol,primary,shots,reload,refilled,hit,paused,error:t.error?.message};
   });
   assert.equal(result.crouch,true);assert.equal(result.left,-1);assert.equal(result.neutral,0);assert.equal(result.right,1);assert.equal(result.pistol,'pistol');assert.equal(result.primary,'rifle');assert.equal(result.shots,1);assert.equal(result.reload,true);assert.equal(result.refilled,30);assert.equal(result.hit,true);assert.equal(result.paused,true);assert.equal(result.error,undefined);
   // Controller-only loadout selection and reconnect safety.
   const navigation=await page.evaluate(()=>{
    const t=testGame;const press=i=>{pad.buttons[i]={pressed:true,value:1};t.pollPad(.016);pad.buttons[i]={pressed:false,value:0};t.pollPad(.016)};
    press(13);press(13);press(15);const selected=document.querySelector('[data-kit][aria-checked="true"]').dataset.kit;
    press(0);const deployed=t.G.state==='play'&&!t.G.paused;
    pad.connected=false;t.pollPad(.016);const disconnected=t.G.paused&&t.PAD.fire===false&&t.PAD.leanDir===0;
    return {selected,deployed,disconnected};
   });assert.equal(navigation.selected,'entry');assert.equal(navigation.deployed,true);assert.equal(navigation.disconnected,true);
   // Actual GPU framebuffer must contain varied scene pixels, not a blank white view.
   const colors=await page.evaluate(()=>{const t=testGame;t.renderer.render(t.scene,t.camera);const gl=t.renderer.getContext();const px=new Uint8Array(4);const colors=[];for(const [x,y] of [[.2,.3],[.5,.5],[.8,.7]]){gl.readPixels(Math.floor(gl.drawingBufferWidth*x),Math.floor(gl.drawingBufferHeight*y),1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);colors.push(Array.from(px).slice(0,3).join(','));}return colors;});
   assert.ok(colors.some(c=>c!=='255,255,255'&&c!=='0,0,0'),'GPU draws scene colors');
   await page.waitForTimeout(50);assert.deepEqual(errors,[]);
   await page.evaluate(()=>{testGame.G.paused=true;testGame.simulate(.016);document.getElementById('pause').hidden=true;});
   await page.waitForTimeout(100);
   await page.screenshot({path:`/tmp/hcb-${map}-${gfx}.png`});
   console.log(`PASS ${map} gfx=${gfx}: 15 valid bot spawns, 3 kits, RT fire, LB crouch, X reload, both stick leans, Y swap, hit detection, pause, rendering without JS errors.`);
   await page.close();
  }
 // Regression cases for unavailable GPU contexts and renderer fallback.
  for(const blocked of [false,true]){
   const page=await browser.newPage();
   await page.route('**/index.html?*',async route=>{
    let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
    html=html.replace("(function(){\n'use strict';", "(function(){\n'use strict';\nTHREE.WebGLRenderer=function(){throw new Error('Simulated primary renderer failure')};");
    await route.fulfill({contentType:'text/html',body:html});
   });
   if(blocked)await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(/webgl/.test(type))return null;return original.call(this,type,...args)}});
   await page.goto('http://127.0.0.1:8769/index.html?map=annex&gfx=0');
   if(blocked){await page.waitForSelector('#retryGraphics');assert.match(await page.locator('#fatal').textContent(),/WebGL 1 fallback/);assert.match(await page.locator('#contextErrors').textContent(),/Simulated primary renderer failure/);}
   else{await page.waitForFunction(()=>document.querySelector('#stage canvas'));assert.equal(await page.locator('#fatal').isVisible(),false);assert.match(await page.locator('#gfxNote').textContent(),/Xbox compatibility/);}
   console.log('PASS graphics recovery: '+(blocked?'all contexts blocked shows actionable error':'primary renderer failure falls back to WebGL 1'));
   await page.close();
  }
 }finally{await browser?.close();server.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
