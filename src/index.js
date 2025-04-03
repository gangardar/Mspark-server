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

env.config();

const port = 3000
const app = express();



mongoose.connect('mongodb://db/mspark')
.then("DB: Connected Successfully to DB")
.catch("DB: Cannot establish connection");

app.use(express.json());
app.use(express.urlencoded({extended: true}));

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



app.use((err, req, res, next) => {
    const statusCode = err.status || 500;
    const status = err.status || "error";
    res.status(statusCode).json({
      success: false,
      status,
      message: err.message || "Something went wrong!",
    });
  });

app.listen(port,()=>console.log(`Server is listening at ${port}`));