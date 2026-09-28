require("dotenv").config();
const express=require("express");
const cors=require("cors");
const {Pool}=require("pg");

const app=express();
app.use(cors());
app.use(express.json());

const pool=new Pool({
 connectionString:process.env.DATABASE_URL,
 ssl:{rejectUnauthorized:false}
});

async function init(){
 await pool.query(`
 CREATE TABLE IF NOT EXISTS users(
 id SERIAL PRIMARY KEY,
 username TEXT,
 password TEXT,
 role TEXT,
 area TEXT
 );

 CREATE TABLE IF NOT EXISTS assets(
 id SERIAL PRIMARY KEY,
 code TEXT UNIQUE,
 name TEXT,
 description TEXT,
 image TEXT,
 instruction TEXT
 );

 CREATE TABLE IF NOT EXISTS scan_logs(
 id SERIAL PRIMARY KEY,
 username TEXT,
 asset_code TEXT,
 created_at TIMESTAMP DEFAULT NOW()
 );
 `);
}

app.get("/",(req,res)=>res.send("ODGJ API ONLINE DATABASE CONNECTED"));

app.post("/users",async(req,res)=>{
 const {username,password,role,area}=req.body;
 await pool.query(
 "INSERT INTO users(username,password,role,area) VALUES($1,$2,$3,$4)",
 [username,password,role,area]
 );
 res.json({message:"User tersimpan"});
});

app.get("/users",async(req,res)=>{
 const r=await pool.query("SELECT * FROM users");
 res.json(r.rows);
});

app.post("/assets",async(req,res)=>{
 const {code,name,description,instruction}=req.body;
 await pool.query(
 "INSERT INTO assets(code,name,description,instruction) VALUES($1,$2,$3,$4)",
 [code,name,description,instruction]
 );
 res.json({message:"Asset tersimpan"});
});

app.get("/assets",async(req,res)=>{
 const r=await pool.query("SELECT * FROM assets");
 res.json(r.rows);
});

app.post("/scan",async(req,res)=>{
 await pool.query(
 "INSERT INTO scan_logs(username,asset_code) VALUES($1,$2)",
 [req.body.username,req.body.asset_code]
 );
 res.json({message:"Scan tersimpan"});
});

app.get("/scan",async(req,res)=>{
 const r=await pool.query("SELECT * FROM scan_logs");
 res.json(r.rows);
});

init()
.then(()=>{

 const PORT = process.env.PORT || 3000;

 app.listen(PORT,()=>{
   console.log("ODGJ API running on port " + PORT);
 });

})
.catch(err=>{
 console.error("DATABASE ERROR:",err);
});
