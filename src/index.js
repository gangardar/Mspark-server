import express from "express";
import cors from "cors";
import userRouter from "./routes/user.js";
import mongoose from "mongoose";
import authRouter from "./routes/auth.js";
import authorizeRoles from "./middleware/authorize.js";
import authMiddleware from "./middleware/auth.js";
import gemRoute from "./routes/gemRoute.js";
import env from "dotenv";
import auctionRoute from "./routes/auction.js";
import bidRoute from "./routes/bids.js";
import coingateRouter from "./routes/coingate.js";
import memepoolRouter from "./routes/mempool.js";
import walletRouter from "./routes/wallet.js";
import { transport } from "./services/MailTransport.js";
import schedule from "node-schedule";
import { initAuctionScheduler } from "./services/ScheduleCompleteAuction.js";
import paymentRouter from "./routes/payment.js";
import deliveryDelivery from "./routes/delivery.js";
import { seedFirstAdmin, seedPrimaryMspark } from "./services/seedData.js";
import msparkRoute from "./routes/mspark.js";
import logger from "./config/logger.js";
import http from "http";
import { Server } from "socket.io";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import Payment from "./models/Payment.js";

env.config();

const port = 3000;
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
try {
  await mongoose.connect("mongodb://db/mspark");
  logger.info("DB: MongoDB connected");
} catch (err) {
  console.log("DB: Connection failed!");
  logger.info(err.message, err);
}


//Seeders --- Start ---

seedPrimaryMspark();
seedFirstAdmin();

//Seeder --- End ---

io.on("connection", (socket) => {
  console.log("a user connected");

  // Join auction room
  socket.on('joinAuction', (auctionId) => {
    socket.join(auctionId);
    console.log(`Socket ${socket.id} joined auction ${auctionId}`);
  });

  // Leave auction room
  socket.on('leaveAuction', (auctionId) => {
    socket.leave(auctionId);
    console.log(`Socket ${socket.id} left auction ${auctionId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Making io accessible in routes
app.set('io',io);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// initAuctionScheduler()

// Enable CORS for all routes
app.use(cors({
  origin:'*'
}));
app.options('*', cors()); // Enable preflight for all routes

// Open for public
app.use("/storage/public", express.static("storage/public"));

app.get("/test", (req, res) => {
  res.send(`Server is listening at ${port}`);
});

app.use("/api/users", userRouter);
app.use("/api/gems", authMiddleware, gemRoute);
app.use("/api/auth", authRouter);
app.use("/api/auctions", auctionRoute);
app.use("/api/bids", bidRoute);
app.use("/api/coingate", coingateRouter);
app.use("/api/memepool", memepoolRouter);
app.use("/api/wallet", walletRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/deliveries", authMiddleware, deliveryDelivery);
app.use("/api/mspark", authMiddleware, authorizeRoles("admin"), msparkRoute);
app.use("/api/admin/dashboard", authMiddleware, authorizeRoles("admin"), dashboardRoutes);

app.post('/coin-gate-send/callback', async (req, res) => {
  const { id, status, external_id } = req.body;
  
  await Payment.updateOne(
    { coinGateId: id },
    { 
      $set: { 
        coinGateStatus: status,
        paymentStatus: status,
        "metadata.coinGateResponse.status": status
      }
    }
  );
  
  res.status(200).end();
});


app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  const status = err.status || "error";
  res.status(statusCode).json({
    success: false,
    status,
    message: err.message || "Something went wrong!",
  });
});

app.get("/test-coingate", async (req, res) => {
  await getCurrencyInfoByTitle("Bitcoin")
    .then((response) => res.send(response))
    .catch((err) => res.send(err));
});

app.get("/test-nodeMailer", async (req, res) => {
  try {
    await transport.sendMail({
      from: '"Sender Name" <sender@example.com>', // Better format
      to: "ggdgangardarggd@gmail.com",
      subject: "Test Email from Express",
      text: "Hello world",
      html: "<b>Hello world</b>", // Optional HTML version
    });

    res.status(200).send("Email sent successfully!");
  } catch (error) {
    console.error("Email error:", error);
    res.status(500).send("Failed to send email.");
  }
});

server.listen(port, "0.0.0.0", () =>
  console.log(`Server is listening at ${port}`)
);

process.on("SIGINT", function () {
  schedule.gracefulShutdown().then(() => process.exit(0));
});
