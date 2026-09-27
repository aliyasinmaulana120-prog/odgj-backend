const express=require('express');
const cors=require('cors');
const sqlite3=require('sqlite3');

const app=express();
app.use(cors());
app.use(express.json());

const db=new sqlite3.Database('./odgj.sqlite');

db.serialize(()=>{
db.run('CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,username TEXT,password TEXT,role TEXT,access_area TEXT)');
db.run('CREATE TABLE IF NOT EXISTS assets(id INTEGER PRIMARY KEY,code TEXT UNIQUE,name TEXT,qr_value TEXT,instruction TEXT)');
db.run('CREATE TABLE IF NOT EXISTS scan_logs(id INTEGER PRIMARY KEY,username TEXT,asset_code TEXT,created_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
});

app.get('/',(req,res)=>res.send('ODGJ API ONLINE'));
app.post('/api/login',(req,res)=>{
db.get('SELECT * FROM users WHERE username=? AND password=?',[req.body.username,req.body.password],(e,r)=>res.json(r||null));
});
app.get('/api/assets',(req,res)=>db.all('SELECT * FROM assets',[],(e,r)=>res.json(r||[])));
app.get('/api/instruction/:code',(req,res)=>db.get('SELECT * FROM assets WHERE code=?',[req.params.code],(e,r)=>res.json(r||null)));
app.post('/api/scan',(req,res)=>{db.run('INSERT INTO scan_logs(username,asset_code) VALUES(?,?)',[req.body.username,req.body.asset_code],()=>res.json({success:true}));});
app.listen(3000,()=>console.log('ODGJ API running'));
