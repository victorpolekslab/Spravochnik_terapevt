const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {readFile}=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'), app=process.env.MEDICAL_UI_APP||'nmp';
const assets=path.join(root,app==='nmp'?'android/app/src/main/assets/www':'web');

test('production SW template: install, update, offline and API bypass',async()=>{
 const html=await readFile(path.join(assets,'index.html'),'utf8');
 const scripts=[...html.matchAll(/<script[^>]+src="([\w.-]+)"/g)].map(x=>x[1]);
 const names=['index.html','app.css',...scripts];
 const template=app==='nmp'?await readFile(path.join(root,'web/sw.js'),'utf8'):
   (await readFile(path.join(root,'tools/build_app.py'),'utf8')).split("SW_JS = r'''")[1].split("'''")[0];
 let version='one', requests=0;
 const server=createServer(async(req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
  if(name==='sw.js'){
   const files=app==='nmp'?names.map(x=>[x,'verified-fixture']):['./',...names];
   res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});
   res.end(template.replace('__VERSION__',version).replace('__FILES__',JSON.stringify(files)) +
     "\nself.addEventListener('message', e => { if (e.data === 'audit-version' && e.ports[0]) e.ports[0].postMessage(VERSION); });");
   return;
  }
  if(name.startsWith('v1/')||name.startsWith('pilot/')){
   res.writeHead(200,{'Cache-Control':'no-store'});res.end(String(++requests));return;
  }
  if(!names.includes(name)){res.writeHead(404).end();return;}
  try{
   let body;
   try{body=await readFile(path.join(assets,name));}
   catch(err){
    if(app!=='terapevt'||!name.endsWith('.js'))throw err;
    body=name==='data_meta.js'?'const META={v:"synthetic"};':'';
   }
   res.writeHead(200,{'Content-Type':name.endsWith('.html')?'text/html':name.endsWith('.css')?'text/css':'text/javascript'}).end(body);
  }catch{res.writeHead(404).end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://localhost:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM,headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext();
  await context.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  await context.tracing.start({screenshots:true,snapshots:true});
  const page=await context.newPage();
  await page.goto(origin+'/index.html'+(app==='nmp'?'#learn':'#about'));
  await page.evaluate(async()=>{localStorage.setItem('audit-preserve','yes');await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;});
  await page.waitForFunction(()=>navigator.serviceWorker.controller);
  const probe=()=>page.evaluate(async()=>Promise.all(['/v1/cache-probe','/pilot/cache-probe'].map(x=>fetch(x).then(r=>r.text()))));
  assert.notDeepEqual(await probe(),await probe());
  assert.equal(await page.evaluate(async()=>{
    const sets=await Promise.all((await caches.keys()).map(async k=>(await caches.open(k)).keys()));
    return sets.flat().some(x=>/\/(?:v1|pilot)\//.test(x.url));
  }),false);
  async function poll(predicate,label){
   for(let i=0;i<160;i++){
    if(await predicate())return;
    await new Promise(resolve=>setTimeout(resolve,50));
   }
   throw Error(label);
  }
  const switchVersion=async next=>{
   version=next;
   await page.evaluate(async()=>{const reg=await navigator.serviceWorker.ready;await reg.update();});
   await poll(()=>page.evaluate(async()=>{
    const worker=(await navigator.serviceWorker.ready).waiting;
    if(!worker)return false;
    worker.postMessage('skip');
    return true;
   }),'updated SW never entered waiting');
   await poll(async()=>{
    try{return await page.evaluate(name=>new Promise(resolve=>{
      const worker=navigator.serviceWorker.controller;
      if(!worker)return resolve(false);
      const channel=new MessageChannel();
      const timer=setTimeout(()=>{channel.port1.close();resolve(false);},200);
      channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data===name);};
      worker.postMessage('audit-version',[channel.port2]);
    }),next);}catch{return false;}
   },'updated SW did not control page: '+next);
   console.log('CONTROLLER_VERSION '+next);
  };
  await page.evaluate(()=>new Promise((resolve,reject)=>{
    const req=indexedDB.open('audit-preserve',1);
    req.onupgradeneeded=()=>req.result.createObjectStore('records');
    req.onerror=()=>reject(req.error);
    req.onsuccess=()=>{const db=req.result;const tx=db.transaction('records','readwrite');
      tx.objectStore('records').put('durable','record');tx.oncomplete=()=>{db.close();resolve();};
      tx.onerror=()=>reject(tx.error);};
  }));
  await switchVersion('two');
  await switchVersion('one');
  await context.setOffline(true);
  await page.reload();
  await page.locator(app==='nmp'?'#lLogin':'#view .card').first().waitFor();
  assert.equal(await page.evaluate(()=>localStorage.getItem('audit-preserve')),'yes');
  await assert.rejects(probe());
  assert.equal(await page.evaluate(()=>new Promise((resolve,reject)=>{
    const req=indexedDB.open('audit-preserve',1);req.onerror=()=>reject(req.error);
    req.onsuccess=()=>{const db=req.result;const read=db.transaction('records').objectStore('records').get('record');
      read.onsuccess=()=>{db.close();resolve(read.result);};read.onerror=()=>reject(read.error);};
  })),'durable');
  await context.tracing.stop({path:'sw-trace.zip'});
  console.log('PWA_REAL_SW PASS '+app+' initial/update/rollback/offline/private-cache-exclusion');
 }finally{await browser.close();server.close();}
});
