import express from 'express'
import cors from 'cors'
import userRouter from './routes/user.js'
import mongoose from 'mongoose'
import authRouter from './routes/auth.js'
import authorizeRoles from './middleware/authorize.js'
import authMiddleware from './middleware/auth.js'

const port = 3000
const app = express()


mongoose.connect('mongodb://db/mspark')
.then("DB: Connected Successfully to DB")
.catch("DB: Cannot establish connection");

app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Enable CORS for all routes
app.use(cors());

app.get('/test', (req, res) => {
    res.send(`Server is listening at ${port}`)
})

app.use('/api/users',authMiddleware,authorizeRoles('admin'),userRouter)
app.use('/api/auth', authRouter)

app.listen(port,()=>console.log(`Server is listening at ${port}`));