const bodyParser = require('body-parser');
const express = require('express')
const app = express()
require('dotenv').config()
const path = require('path');
const { MongoClient } = require('mongodb')

app.use(express.static(path.join(__dirname, '/public')))

app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))
app.set('trust proxy', true);

// app.use((req, res, next) => {
//   const host = req.hostname; // например: musor.example.com
//   if (host !== 'musor.example.com') {
//     return res.status(403).send('Access denied'); // не обрабатываем другие хосты
//   }
//   next();
// });

let database = new MongoClient(`mongodb+srv://admin:${process.env.MONGODB_TOKEN}@cluster0.z32dg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`)
async function connect() {
  try {
    await database.connect();
    await collection.createIndex({ date: 1 }, { expireAfterSeconds: 172800 })
    console.log('✅ TTL индекс создан, база подключена');
  } catch (err) {
    console.error('Ошибка подключения к базе:', err);
  }
}

connect()

const _db = database.db('main');
const collection = _db.collection('ip-submissions');

app.get('/', (req, res) => {
    res.render('musor')
})

app.post('/newBid', async (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);


    const recent = await collection.findOne({
        ip,
        date: { $gte: twoDaysAgo },
    });

    if (recent) {
        return res.status(429).send('The bid was created recently')
    }
    res.status(200).send('New bid success')
    await collection.insertOne({ ip, date: now });

    // Здесь можно отправлять email или сохранять заявку
    // res.send('✅ Заявка прийнята!');
})

app.listen(3000)
console.log(3000)