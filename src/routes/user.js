import Joi from "joi";
import express from "express";
import bcrypt from "bcrypt";
import {
  authUser,
  createUser,
  deleteUser,
  getMe,
  getUser,
  getUserById,
  getUserWithPagination,
  updateUser,
} from "../controller/userController.js";
import authMiddleware from "../middleware/auth.js";
import { registerSchema } from "./auth.js";

const userRouter = express.Router(); // Initialize the Express router

// Define the Joi schema for user validation
const userScheme = Joi.object({
  fullName: Joi.string().required().min(3).max(255),
  username: Joi.string().required().min(3).max(255),
  role: Joi.string().required().valid("admin", "merchant", "bidder"),
  profile: Joi.string(),
  email: Joi.string().email().trim().lowercase().required(),
  password: Joi.string(),
  idProof: Joi.array(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().trim().lowercase().required(),
  password: Joi.string().required().min(3).max(255),
});

// GET users with pagination
userRouter.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const user = await getUserWithPagination(page, limit); // Fetch the user by ID
    if (!user || (typeof user === "object" && Object.keys(user).length === 0)) {
      return res.status(404).send("No User Found!"); // Send 404 if user not found
    }
    res.send(user); // Send the user data as a response
  } catch (err) {
    console.error(err); // Log the error properly
    res.status(500).send(err.message); // Send a 500 status with the error message
  }
});

// GET a user by ID
userRouter.get("/:id", async (req, res) => {
  try {
    const user = await getUserById(req.params.id); // Fetch the user by ID
    if (!user || (typeof user === "object" && Object.keys(user).length === 0)) {
      return res.status(404).send("No User Found!"); // Send 404 if user not found
    }
    res.send(user); // Send the user data as a response
  } catch (err) {
    console.error(err); // Log the error properly
    res.status(500).send(err.message); // Send a 500 status with the error message
  }
});

// Register a new user
userRouter.post("/register", async (req, res) => {
  try {
    const { error } = registerSchema.validate(req.body); // Validate the request body
    if (error) {
      return res.status(400).send(error.details[0].message); // Send validation error
    }
    const userObj = await createUser(req.body); // Create a new user
    const token = userObj.generateAuthToken(); // Generate authentication token
    return res.header("x-auth-token", token).send(userObj); // Send the user object with the token in the header
  } catch (e) {
    return res.status(400).send(e.message); // Send error message if something goes wrong
  }
});

// Update a user by ID
userRouter.put("/:id", async (req, res) => {
  try {
    const { error } = userScheme.validate(req.body); // Validate the request body
    if (error) {
      return res.status(400).send(error.details[0].message); // Send validation error
    }
    const userObj = await updateUser(req.params.id, req.body); // Update the user
    if (
      !userObj ||
      (typeof userObj === "object" && Object.keys(userObj).length === 0)
    ) {
      return res.status(404).send("Not Found!"); // Send 404 if user not found
    }
    return res.send(userObj); // Send the updated user data as a response
  } catch (err) {
    return res.status(400).send(err.message); // Send error message if something goes wrong
  }
});

// Get the authenticated user's profile
userRouter.get("/me", authMiddleware, async (req, res) => {
  try {
    const id = req.user._id; // Get the authenticated user's ID from the middleware
    const userObj = await getMe(id); // Fetch the user's profile
    if (
      !userObj ||
      (typeof userObj === "object" && Object.keys(userObj).length === 0)
    ) {
      return res.status(404).send("Not Found"); // Send 404 if user not found
    }
    return res.send(userObj); // Send the user's profile data as a response
  } catch (e) {
    return res.status(400).send(e.message); // Send error message if something goes wrong
  }
});

// DELETE a user by ID
userRouter.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id; // Get the user ID from the request parameters
    console.log(id); // Log the ID (for debugging purposes)
    const userObj = await deleteUser(id); // Delete the user
    if (
      !userObj ||
      (typeof userObj === "object" && Object.keys(userObj).length === 0)
    ) {
      return res.status(404).send("Not Found!"); // Send 404 if user not found
    }
    return res.send(userObj); // Send the deleted user data as a response
  } catch (err) {
    return res.status(400).send(err.message); // Send error message if something goes wrong
  }
});

export default userRouter; // Export the router
