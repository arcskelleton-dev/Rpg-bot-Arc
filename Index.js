{
  "name": "arc-bot",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": { "start": "node index.js" },
  "dependencies": {
    "@whiskeysockets/baileys": "^6.7.8",
    "qrcode-terminal": "^0.12.0",
    "pino": "^8.16.0"
  }
}
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const P = require('pino')
const fs = require('fs')
const qrcode = require('qrcode-terminal')

let db = { users: {} }
try{ db = JSON.parse(fs.readFileSync('./db.json')) }catch(e){}

function save(){ fs.writeFileSync('./db.json', JSON.stringify(db)) }

const ANIME = ["Goku","Naruto","Luffy","Gojo","Ichigo","Asta","Tanjiro","Saitama","Zoro","Itachi","Madara","Lelouch","Guts","Eren","Sukuna"]
let spawn = null

async function start(){
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const sock = makeWASocket({ auth: state, logger: P({level:'silent'}) })
  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', u=>{
    if(u.qr) qrcode.generate(u.qr,{small:true})
    if(u.connection==='open') console.log('ARC ONLINE')
  })

  setInterval(()=>{
    spawn = { nome: ANIME[Math.floor(Math.random()*ANIME.length)], hora: Date.now() }
    console.log('SPAWNOU:', spawn.nome)
  }, 1000*60*45)

  sock.ev.on('messages.upsert', async ({messages})=>{
    const m = messages[0]
    if(!m.message) return
    const from = m.key.remoteJid
    const body = m.message.conversation || m.message.extendedTextMessage?.text || ""
    if(!body.startsWith('!')) return
    const args = body.slice(1).trim().split(/ +/)
    const cmd = args.shift().toLowerCase()
    const id = m.key.participant || from
    if(!db.users[id]) db.users[id] = { xp:0, level:1, moedas:100, raca:null, dom:null, familia:null, inv:[], pets:[], pers:[], andar:0, daily:0 }
    const u = db.users[id]

    if(cmd==='iniciar'){
      const racas = ['Humano','Demônio','Elfo','Vampiro']
      const dons = ['Força','Fogo','Gelo','Mítico']
      u.raca = racas[Math.floor(Math.random()*racas.length)]
      let r = Math.random()*100
      u.dom = r<0.5?'Mítico [0.5%]':r<5?'Lendário [5%]':r<20?'Raro':'Comum'
      save()
      await sock.sendMessage(from,{text:`⚔️ ARC - Bem vindo!\nRaça: ${u.raca}\nDom: ${u.dom}\n\n!perfil!masmorra!menu`})
    }
    if(cmd==='perfil') await sock.sendMessage(from,{text:`👤 Perfil\nLv: ${u.level} | XP: ${u.xp}\nRaça: ${u.raca}\nDom: ${u.dom}\nMoedas: ${u.moedas}\nPersonagens: ${u.pers.join(', ')||'nenhum'}\nAndar: ${u.andar}`})
    if(cmd==='daily'){
      if(Date.now()-u.daily < 86400000) return sock.sendMessage(from,{text:'⏳ Já pegou hoje!'})
      u.moedas+=500; u.daily=Date.now(); save(); sock.sendMessage(from,{text:'✅ +500 moedas!'})
    }
    if(cmd==='treinar'){ u.xp+=50; u.moedas+=20; if(u.xp>u.level*100){u.level++;u.xp=0; sock.sendMessage(from,{text:`🎉 LEVEL UP! Lv ${u.level}`})} save(); sock.sendMessage(from,{text:'💪 +50 XP'})}
    if(cmd==='masmorra'){
      u.andar++; let roll=Math.random()*100; let drop=null
      if(roll<0.5) drop='LENDÁRIO'; else if(roll<5) drop='Épico'; else if(roll<20) drop='Raro'
      if(drop){u.inv.push(drop)} save()
      sock.sendMessage(from,{text:`🏰 Andar ${u.andar} - Matou Slime!\nDrop: ${drop||'nada :('}\nChance lendária 0.5% pura sorte!`})
    }
    if(cmd==='boss') sock.sendMessage(from,{text:'👹 BOSS GLOBAL! Digite!atacar'})
    if(cmd==='atacar') sock.sendMessage(from,{text:`💥 Dano: ${Math.floor(Math.random()*100)+u.level*10}`})
    if(cmd==='recrutar'){
      if(!spawn) return sock.sendMessage(from,{text:'Nenhum spawn agora. Spawna a cada 45min!'})
      if(args.join(' ').toLowerCase()===spawn.nome.toLowerCase()){
        u.pers.push(spawn.nome); spawn=null; save()
        sock.sendMessage(from,{text:`🎉 Você recrutou! Primeiro que digitou levou!`})
      } else sock.sendMessage(from,{text:`Nome errado! Era ${spawn.nome}`})
    }
    if(cmd==='capturar'){ if(Math.random()<0.2){u.pets.push('Slime'); save(); sock.sendMessage(from,{text:'✅ Capturou Slime!'})} else sock.sendMessage(from,{text:'❌ Falhou!'})}
    if(cmd==='loja') sock.sendMessage(from,{text:'🛒 LOJA\nPoção 100!comprar pocao'})
    if(cmd==='inventario') sock.sendMessage(from,{text:`🎒 ${u.inv.join('\\n')||'vazio'}`})
    if(cmd==='menu') sock.sendMessage(from,{text:`🤖 ARC MENU\n!iniciar\n!perfil\n!daily\n!treinar\n!masmorra\n!boss!atacar\n!recrutar <nome>\n!capturar\n!loja!inventario`})
  })
}
start()
