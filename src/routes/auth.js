import Joi from "joi";
import express from "express";
import bcrypt from "bcrypt";
import { authUser, changePassword, createUser, forgotPassword, getMe, handleForgotPassword } from "../controller/userController.js";
import authMiddleware from "../middleware/auth.js";

const authRouter = express.Router(); // Initialize the Express router

// Define the Joi schema for user validation
export const registerSchema = Joi.object({
  fullName: Joi.string().required().min(3).max(255),
  username: Joi.string().required().min(3).max(255),
  role: Joi.string().required().valid("admin", "merchant", "bidder"),
  profile: Joi.string(),
  email: Joi.string().email().trim().lowercase().required(),
  password: Joi.string().required().min(3).max(255),
  idProof: Joi.array(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().trim().lowercase().required(),
  password: Joi.string().required().min(3).max(255),
});

authRouter.post("/register", async (req, res) => {
  try {
    const { error } = registerSchema.validate(req.body); // Validate the request body
    if (error) {
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message }); // Send validation error
    }
    const userObj = await createUser(req.body); // Create a new user
    const token = userObj.generateAuthToken(); // Generate authentication token
    res.header("Access-Control-Expose-Headers", "x-auth-token");
    return res
      .header("x-auth-token", token)
      .json({
        success: true,
        message: "Registerated Successfullly",
        data: userObj,
      }); // Send the user object with the token in the header
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message }); // Send error message if something goes wrong
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { error } = loginSchema.validate(req.body); // Validate the request body
    if (error) {
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message }); // Send validation error
    }
    const userObj = await authUser(req.body.email);
    if (
      !userObj ||
      (typeof userObj === "object" && Object.keys(userObj).length === 0)
    ) {
      return res
        .status(404)
        .json({ success: false, message: "User Not Found!" }); // Send 404 if user not found
    }
    const isMatch = await bcrypt.compare(req.body.password, userObj.password); // Create a new user
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid Credentail!" });
    }
    const token = userObj.generateAuthToken(); // Generate authentication token
    res.header("Access-Control-Expose-Headers", "x-auth-token");
    return res
      .header("x-auth-token", token)
      .json({ success: true, message: "Login Successfully!" }); // Send the user object with the token in the header
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message }); // Send error message if something goes wrong
  }
});

// Get the authenticated user's profile
authRouter.get("/me", authMiddleware, async (req, res) => {
  try {
    const id = req.user._id; // Get the authenticated user's ID from the middleware
    const userObj = await getMe(id); // Fetch the user's profile
    if (
      !userObj ||
      (typeof userObj === "object" && Object.keys(userObj).length === 0)
    ) {
      return res.status(404).json({ success: false, message: "Not Found" }); // Send 404 if user not found
    }
    return res.json({
      success: true,
      message: "User retrived Successfully",
      data: userObj,
    }); // Send the user's profile data as a response
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message }); // Send error message if something goes wrong
  }
});

authRouter.post("/forgotPassword", forgotPassword);
authRouter.put("/forgotPassword", changePassword);
authRouter.get("/forgotPassword", handleForgotPassword);


export default authRouter;
