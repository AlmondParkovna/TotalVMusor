const bodyParser = require('body-parser');
const express = require('express')
const app = express()
require('dotenv').config({ quiet: true })
const path = require('path');
const { MongoClient } = require('mongodb')
const ejs = require('ejs')
const nodemailer = require('nodemailer')
const cookieParser = require('cookie-parser');
const csrf = require('csurf')
const multer = require('multer');
const upload = multer();

app.use(express.static(path.join(__dirname, '/public')))

app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))
app.set('trust proxy', true);
app.use(cookieParser());

app.use(csrf({ cookie: {
    httpOnly: true,
    secure: true,       
    sameSite: 'lax'     
  }})); // CSRF защита
app.use((req, res, next) => {
  const host = req.hostname; // например: musor.example.com
  if (host !== 'musor.totalvtor.od.ua') {
    return res.status(404).send('Not found'); // не обрабатываем другие хосты
  }
  next();
});




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

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // используй пароль приложения
    }
});

function formatDate (date) {
    const pad = (n) => n.toString().padStart(2, '0');
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    return `${hours}:${minutes}, ${day}.${month}.${year}`;
};

async function sendNewBidEmail(data) {
    const templatePath = path.join(__dirname, 'views', 'mail', 'newBid.ejs');
    const html = await ejs.renderFile(templatePath, data);

    await transporter.sendMail({
        from: 'Тотал Втор <total.vtor.manager@gmail.com>',
        to: process.env.TO_EMAIL,
        subject: 'Нова заявка',
        html: html
    });
}






connect()

const _db = database.db('main');
const collection = _db.collection('ip-submissions');

app.get('/', (req, res) => {
    const token = req.csrfToken()
    res.render('musor', { csrfToken: token })
})

app.post('/newBid', upload.none(), async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    

    const { userName, userPhone, userDistrict, userAdress, userSize } = req.body

    const userHrefPhone = userPhone.replace(/[-()\s]/g, '')

    const recent = await collection.findOne({
        ip,
        date: { $gte: twoDaysAgo },
    });

    if (recent) {
        return res.status(429).send('The bid was created recently')
    }
    res.status(200).send('New bid success')
    await collection.insertOne({ ip, date: now });

    const containerSizeString = userSize.split(' ')
    const containerNewSize = containerSizeString.slice(0, 2).join(' ')
    const containerPrice = containerSizeString[2].slice(1, -1)


    sendNewBidEmail({ timeFormatted: formatDate(new Date()), userName, userPhone, userHrefPhone, userDistrict, userAdress, containerSize: containerNewSize, price: containerPrice })
})

app.use((req, res) => {
  res.status(404).render('404', { url: req.originalUrl });
});

const port = process.env.PORT || 3001

app.listen(port)
console.log('Listening musor on ' + port)