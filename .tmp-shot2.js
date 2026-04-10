const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');
const ROOT = path.resolve('/mnt/d/nova');
const PORT = 41741;
const MIME = {'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};
const server = http.createServer((req,res)=>{
  const reqPath = decodeURIComponent((req.url||'/').split('?')[0]);
  const safe = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(ROOT, safe === '/' ? 'novel_upload_pc.html' : safe);
  fs.readFile(filePath,(err,body)=>{
    if(err){res.writeHead(404);res.end('Not found');return;}
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {'Content-Type': MIME[ext] || 'text/plain; charset=utf-8'});
    res.end(body);
  });
});
(async()=>{
  await new Promise(r=>server.listen(PORT,'127.0.0.1',r));
  const browser = await chromium.launch({headless:true});
  const page = await browser.newPage({ viewport: { width: 1222, height: 514 } });
  await page.route('**/assets/supabase-config.js', async route => route.fulfill({status:200, contentType:'application/javascript', body:'window.inkroadSupabaseConfig={url:"https://example.supabase.co",publishableKey:"public-test-key"};'}));
  await page.route('**/@supabase/supabase-js@2', async route => route.fulfill({status:200, contentType:'application/javascript', body:`window.supabase={createClient(){const session={access_token:'t',user:{id:'u1',email:'writer@example.com',user_metadata:{display_name:'Writer'}}};return {auth:{getSession:async()=>({data:{session}}),onAuthStateChange(cb){setTimeout(()=>cb('INITIAL_SESSION',session),0);return {data:{subscription:{unsubscribe(){}}}}},signOut:async()=>({error:null})},rpc:async()=>({data:null,error:null}),storage:{from(){return {upload:async()=>({error:null,data:{path:'fake'}}),getPublicUrl(){return {data:{publicUrl:'https://example.com/fake.png'}}}}}}};}};`}));
  await page.route('**/assets/supabase-live.js', async route => route.fulfill({status:200, contentType:'application/javascript', body:''}));
  await page.goto(`http://127.0.0.1:${PORT}/novel_upload_pc.html`, {waitUntil:'domcontentloaded'});
  await page.waitForSelector('[data-upload-body]', {state:'visible'});
  await page.screenshot({ path: 'D:/nova/.tmp-upload-current.png' });
  await browser.close();
  await new Promise(r=>server.close(r));
})();
