import express from 'express'
import cors from 'cors'
import userRouter from './routes/user.js'
import mongoose from 'mongoose'
import authRouter from './routes/auth.js'
import authorizeRoles from './middleware/authorize.js'
import authMiddleware from './middleware/auth.js'
import gemRoute from './routes/gemRoute.js'
import env from 'dotenv'
import auctionRoute from './routes/auction.js'
import bidRoute from './routes/bids.js'
import coingateRouter from './routes/coingate.js'
import memepoolRouter from './routes/mempool.js'
import walletRouter from './routes/wallet.js'
import { transport } from './services/MailTransport.js'
import schedule from 'node-schedule'
import { initAuctionScheduler } from './services/ScheduleCompleteAuction.js'
import paymentRouter from './routes/payment.js'

env.config();

const port = 3000
const app = express();

mongoose.connect('mongodb://db/mspark')
.then("DB: Connected Successfully to DB")
.catch("DB: Cannot establish connection");

app.use(express.json());
app.use(express.urlencoded({extended: true}));
// initAuctionScheduler()

// Enable CORS for all routes
app.use(cors());

// Open for public
app.use("/storage/public", express.static("storage/public"));

app.get('/test', (req, res) => {
    res.send(`Server is listening at ${port}`)
})

app.use('/api/users',userRouter)
app.use('/api/gems',authMiddleware,gemRoute)
app.use('/api/auth', authRouter)
app.use('/api/auctions', auctionRoute)
app.use('/api/bids', bidRoute)
app.use('/api/coingate', coingateRouter)
app.use('/api/memepool', memepoolRouter)
app.use('/api/wallet', walletRouter)
app.use('/api/payments', paymentRouter)


app.use((err, req, res, next) => {
    const statusCode = err.status || 500;
    const status = err.status || "error";
    res.status(statusCode).json({
      success: false,
      status,
      message: err.message || "Something went wrong!",
    });
  });

  app.get('/test-coingate', async(req, res) => {
   await getCurrencyInfoByTitle("Bitcoin")
  .then((response) => res.send(response))
  .catch(err => res.send(err));
  })

  app.get('/test-nodeMailer', async (req, res) => {
    try {
      await transport.sendMail({
        from: '"Sender Name" <sender@example.com>', // Better format
        to: 'ggdgangardarggd@gmail.com',
        subject: 'Test Email from Express',
        text: 'Hello world',
        html: '<b>Hello world</b>' // Optional HTML version
      });
  
      res.status(200).send('Email sent successfully!');
    } catch (error) {
      console.error('Email error:', error);
      res.status(500).send('Failed to send email.');
    }
  });

app.listen(port, '0.0.0.0',()=>console.log(`Server is listening at ${port}`));

process.on('SIGINT', function () { 
  schedule.gracefulShutdown()
  .then(() => process.exit(0))
});