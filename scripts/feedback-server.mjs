import http from 'node:http';
import {promises as fs} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

const root=fileURLToPath(new URL('../feedback/',import.meta.url)),dataDir=process.env.SUNNY_FEEDBACK_DATA_DIR?path.resolve(process.env.SUNNY_FEEDBACK_DATA_DIR):path.join(root,'data'),file=path.join(dataDir,'cards.json');
const port=Number(process.env.SUNNY_FEEDBACK_PORT??5174),origin=`http://127.0.0.1:${port}`;
await fs.mkdir(dataDir,{recursive:true});
try{await fs.writeFile(file,JSON.stringify({version:1,cards:[]},null,2),{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;}
const load=async()=>{const data=JSON.parse(await fs.readFile(file,'utf8'));if(data.version!==1||!Array.isArray(data.cards))throw Error('Неверный формат cards.json');return data;};
await load(); // Never silently replace a damaged database.
let queue=Promise.resolve();
async function save(data){await fs.copyFile(file,file+'.backup');await fs.writeFile(file+'.tmp',JSON.stringify(data,null,2)+'\n');await fs.rename(file+'.tmp',file);}
function response(res,status,body,type='application/json; charset=utf-8'){res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(type.startsWith('application/json')?JSON.stringify(body):body);}
async function body(req){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>1024*1024)throw Error('Запись слишком большая');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
const types=['bug','feedback','suggestion'],statuses=['new','working','review','closed'];
function fields(input){
  const text=key=>String(input[key]??'').trim();
  const value={author:text('author'),text:text('text'),type:text('type'),status:text('status'),build:text('build'),comment:text('comment')};
  if(!value.author||!value.text)throw Error('Укажи автора и текст');
  if(value.author.length>160||value.text.length>30000||value.comment.length>30000||value.build.length>160)throw Error('Слишком длинное поле');
  if(!types.includes(value.type)||!statuses.includes(value.status))throw Error('Неизвестный тип или статус');return value;
}
const server=http.createServer(async(req,res)=>{
  try{
    if(req.headers.host!==`127.0.0.1:${port}`&&req.headers.host!==`localhost:${port}`)return response(res,403,{error:'Только локальный доступ'});
    const url=new URL(req.url,origin);
    if(req.method==='GET'&&url.pathname==='/')return response(res,200,await fs.readFile(path.join(root,'index.html')),'text/html; charset=utf-8');
    if(req.method==='GET'&&url.pathname==='/api/cards')return response(res,200,await load());
    if(req.method==='GET'&&url.pathname==='/export'){res.setHeader('Content-Disposition','attachment; filename="sunny-feedback.json"');return response(res,200,await load());}
    if(req.method==='POST'&&url.pathname==='/api/cards'){
      if(req.headers.origin!==origin||!req.headers['content-type']?.startsWith('application/json'))return response(res,403,{error:'Недопустимый источник запроса'});
      const input=await body(req),value=fields(input);
      const operation=queue.then(async()=>{
        const data=await load(),now=new Date().toISOString();
        let card;if(input.id){card=data.cards.find(c=>c.id===input.id);if(!card)throw Error('Карточка не найдена');if(input.updatedAt!==card.updatedAt)throw Error('Карточка уже изменена. Обнови список перед сохранением.');Object.assign(card,value,{updatedAt:now});}
        else{card={id:randomUUID(),...value,createdAt:now,updatedAt:now};data.cards.unshift(card);}
        await save(data);return card;
      });queue=operation.catch(()=>{});return response(res,200,await operation);
    }
    response(res,404,{error:'Не найдено'});
  }catch(error){console.error(error.message);response(res,400,{error:error.message});}
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`Порт ${port} уже занят. Возможно, доска уже запущена: ${origin}`:error);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Sunny — баги и фидбек: ${origin}\nДанные: ${file}\nДля остановки нажми Ctrl+C.`));
