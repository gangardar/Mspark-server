import Joi from "joi";
import express from "express";
import bcrypt from "bcrypt";
import {
  addAddress,
  createUser,
  deleteUser,
  getAllUsers,
  getMe,
  getNotDeletedUserWithPagination,
  getNotDeletedUserWithPaginationWithRole,
  getUserById,
  restoreUser,
  softDeleteUser,
  updateUser,
} from "../controller/userController.js";
import authMiddleware from "../middleware/auth.js";
import { registerSchema } from "./auth.js";
import authorizeRoles from "../middleware/authorize.js";

const userRouter = express.Router();

// Joi schemas
const userSchema = Joi.object({
  fullName: Joi.string().required().min(3).max(255),
  username: Joi.string().required().min(3).max(255),
  role: Joi.string().required().valid("admin", "merchant", "bidder"),
  profile: Joi.string(),
  email: Joi.string().email().trim().lowercase().required(),
  password: Joi.string(),
  idProof: Joi.array(),
});

// GET users with pagination
userRouter.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const {role} = req.query;

    const { users, total } = await getNotDeletedUserWithPagination(page, limit, role);

    if (!users || users.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No users found",
        data: [],
        meta: { pagination: { total: 0, page, limit } },
      });
    }

    res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: users,
      meta: {
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching users",
      error: err.message,
    });
  }
});

userRouter.get("/all", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const {role} = req.query;

    const { users, total } = await getAllUsers(page, limit, role);

    if (!users || users.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No users found",
        data: [],
        meta: { pagination: { total: 0, page, limit } },
      });
    }

    res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: users,
      meta: {
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching users",
      error: err.message,
    });
  }
});

// GET a user by ID
userRouter.get("/:id", async (req, res) => {
  try {
    const user = await getUserById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: null,
      });
    }

    res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      data: user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching user",
      error: err.message,
    });
  }
});

// GET users by role with pagination
userRouter.get("/role/:role", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { role } = req.params;

    if (!["admin", "merchant", "bidder"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role specified",
        data: null,
      });
    }

    const { users, total } = await getNotDeletedUserWithPaginationWithRole(
      page,
      limit,
      role
    );

    if (!users || users.length === 0) {
      return res.status(200).json({
        success: true,
        message: `No ${role}s found`,
        data: [],
        meta: { pagination: { total: 0, page, limit } },
      });
    }

    res.status(200).json({
      success: true,
      message: `${role}s retrieved successfully`,
      data: users,
      meta: {
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching users by role",
      error: err.message,
    });
  }
});

// Register a new user
userRouter.post("/register", async (req, res) => {
  try {
    const { error } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: error.details[0].message,
      });
    }

    const userObj = await createUser(req.body);
    const token = userObj.generateAuthToken();

    res.status(201).header("x-auth-token", token).json({
      success: true,
      message: "User registered successfully",
      data: userObj,
      token,
    });
  } catch (e) {
    res.status(400).json({
      success: false,
      message: "Registration failed",
      error: e.message,
    });
  }
});

//Add User Address
userRouter.post('/address',authMiddleware, authorizeRoles("merchant","bidder"), addAddress)

// Update a user by ID
userRouter.put("/:id", async (req, res) => {
  try {
    const { error } = userSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: error.details[0].message,
      });
    }

    const userObj = await updateUser(req.params.id, req.body);

    if (!userObj) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: null,
      });
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: userObj,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: "Update failed",
      error: err.message,
    });
  }
});

// Get authenticated user's profile
userRouter.get("/me", authMiddleware, async (req, res) => {
  try {
    const userObj = await getMe(req.user._id);

    if (!userObj) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: null,
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile retrieved successfully",
      data: userObj,
    });
  } catch (e) {
    res.status(400).json({
      success: false,
      message: "Failed to fetch profile",
      error: e.message,
    });
  }
});

// Soft delete a user
userRouter.delete("/:id/softDelete", async (req, res) => {
  try {
    const userObj = await softDeleteUser(req.params.id);

    if (!userObj) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: null,
      });
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
      data: userObj,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: "Deletion failed",
      error: err.message,
    });
  }
});

userRouter.delete("/:id", async (req, res) => {
  try {
    const userObj = await deleteUser(req.params.id);

    if (!userObj) {
      return res.status(404).json({
        success: false,
        message: "User not found!",
        data: null,
      });
    }

    res.status(200).json({
      success: true,
      message: "User permanently deleted successfully",
      data: userObj,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Deletion failed",
      error: err.message,
    });
  }
});

userRouter.put("/:id/restore", async (req, res) => {
  try {
    const userObj = await restoreUser(req.params.id);

    if (!userObj) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: null,
      });
    }

    res.status(200).json({
      success: true,
      message: "User restored successfully",
      data: userObj,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: "Deletion failed",
      error: err.message,
    });
  }
});

export default userRouter;
