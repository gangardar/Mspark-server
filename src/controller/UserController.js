import User from "../models/User.js";
import bcrypt from "bcrypt";
import { validateAddress } from "../validator/addressValidator.js";
import Address from "../models/Address.js";
import { forgotPasswordEmail } from "../services/MailTemplates.js";
import { transport } from "../services/MailTransport.js";
import logger from "../config/logger.js";
import Jwt from 'jsonwebtoken'

export const createUser = async (user) => {
  try {
    let isExist = await User.findOne({ email: user.email });
    if (isExist) throw new Error("User with this email already exist!");
    user.password = await bcrypt.hash(user.password, 10);
    const userObj = new User(user);
    return await userObj.save();
  } catch (e) {
    throw new Error(e.message);
  }
};

export const addAddress = async (req, res) => {
  const { error, value } = validateAddress(req.body);
  const { country, state, city, street, houseNo, postalcode } = req.body;
  const { _id } = req.user; // Destructure properly

  // Validation
  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    return res.status(400).json({
      success: false,
      messages: errorMessages,
    });
  }

  const userWithAddress = await User.findOne({
    _id: _id,
    address: { $exists: true }, // Checks if address field exists
  }).select("address");

  if (userWithAddress?.address) {
    return res.status(400).json({
      success: false,
      message: "User already has an address", // "message" not "messages"
    });
  }

  try {
    // Create address
    const address = {
      country,
      state,
      city,
      street,
      houseNo,
      postalcode,
      user: _id,
    };

    // Use await for both operations
    const addressObj = await Address.create(address);

    // Update user with the new address ID
    await User.findByIdAndUpdate(
      _id,
      { address: addressObj._id }, // Use the created address's ID
      { new: true } // Return the updated document
    );

    return res.status(201).json({
      success: true,
      message: "Address added successfully!",
      data: addressObj,
    });
  } catch (error) {
    console.error("Address creation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add address",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};


export const updateAddress = async (req, res) => {
  try {
    // Validate input
    const { error } = validateAddress(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        messages: error.details.map(d => d.message),
      });
    }

    // Extract fields
    const { id } = req.params;
    const { country, state, city, street, houseNo, postalcode } = req.body;

    // Update address
    const updatedAddress = await Address.findByIdAndUpdate(
      id,
      { country, state, city, street, houseNo, postalcode },
      { new: true, runValidators: true }
    );

    if (!updatedAddress) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Address updated successfully",
      data: updatedAddress,
    });

  } catch (error) {
    console.error("Address update error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getAllUsers = async (page, limit, role) => {
  try {
    const skip = (page - 1) * limit;
    const query = {};
    if (role) query.role = role;
    const users = await User.find(query)
      .populate("address wallet")
      .sort("name")
      .skip(skip)
      .limit(limit);
    const total = await User.countDocuments(query); //Get total count of users
    return {
      users,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  } catch (err) {
    return new Error(err.message);
  }
};

export const getNotDeletedUserWithPagination = async (page, limit, role) => {
  try {
    const skip = (page - 1) * limit;
    const query = { isDeleted: false };
    if (role) query.role = role;
    const users = await User.find(query)
      .populate("address wallet")
      .sort("name")
      .skip(skip)
      .limit(limit);
    const total = await User.countDocuments(query); //Get total count of users
    return {
      users,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  } catch (err) {
    return new Error(err.message);
  }
};

export const getNotDeletedUserWithPaginationWithRole = async (
  page,
  limit,
  role
) => {
  try {
    const skip = (page - 1) * limit;
    const users = await User.find({ isDeleted: false, role })
      .sort("name")
      .skip(skip)
      .limit(limit);
    const total = await User.countDocuments({ isDeleted: false, role });
    return {
      users,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  } catch (err) {
    return new Error(err.message);
  }
};

export const getUserById = async (id) => {
  try {
    return await User.find({ _id: id });
  } catch (e) {
    return new Error(e.message);
  }
};

export const authUser = async (email) => {
  try {
    return await User.findOne({ email });
  } catch (err) {}
};

export const getMe = async (id) => {
  try {
    return await User.findById(id)
      .populate("wallet address")
      .select("-password");
  } catch (err) {
    return new Error(err.message);
  }
};

export const updateUser = async (id, body) => {
  try {
    return await User.findByIdAndUpdate(id, { $set: body }, { new: true });
  } catch (err) {
    return new Error(err.message);
  }
};

export const deleteUser = async (id) => {
  try {
    return await User.findByIdAndDelete(id);
  } catch (e) {
    return new Error(e.message);
  }
};

//softdelete a user
export const softDeleteUser = async (id) => {
  try {
    const user = await User.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedAt: Date.now() },
      { new: true }
    );
    return user;
  } catch (error) {
    throw new Error(error.message);
  }
};

//softdelete a user
export const restoreUser = async (id) => {
  try {
    const user = await User.findByIdAndUpdate(
      id,
      { isDeleted: false },
      { new: true }
    );
    return user;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email input
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Find user (with proper error handling for DB operations)
    const user = await User.findOne({ email }).exec();
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User doesn't exist!",
      });
    }

    if (user.isDeleted) {
      return res.status(403).json({
        success: false,
        message: "Account suspended. Please contact support.",
      });
    }

    // Generate token with error handling
    let token;
    try {
      token = user.generateAuthToken("1h");
    } catch (tokenError) {
      console.error("Token generation failed:", tokenError);
      return res.status(500).json({
        success: false,
        message: "Could not generate security token",
      });
    }

    // Prepare and send email
    try {
      const forgotPasswordEmailDraft = forgotPasswordEmail(user, token);
      
      await transport.sendMail({
        from: '"Security System" noreply-auto@mspark.com',
        to: user.email,
        ...forgotPasswordEmailDraft,
      });

      // Log success but don't expose details in response
      logger.info(`Password reset email sent to ${email.toString()}`);

      return res.status(200).json({
        success: true,
        message: "If an account exists with this email, a password reset link has been sent",
      });

    } catch (emailError) {
      logger.error("Email sending failed:", emailError);
      return res.status(502).json({
        success: false,
        message: "Failed to send password reset email",
      });
    }

  } catch (error) {
    console.error("Unexpected error in forgotPassword:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Validate input
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
      });
    }

    // Password strength validation
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = Jwt.verify(token, process.env.JWT_SECRET_KEY);
    } catch (tokenError) {
      logger.error("Token verification failed:", tokenError.message);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    // Hash the new password
    let hashedPassword;
    try {
      hashedPassword = await bcrypt.hash(newPassword, 10);
    } catch (hashError) {
      logger.error("Password hashing failed:", hashError);
      return res.status(500).json({
        success: false,
        message: "Failed to process password",
      });
    }

    // Update user password
    try {
      const result = await User.findByIdAndUpdate(decoded?._id,
        { 
          password: hashedPassword,
        },
        {new : true}
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.status(200).json({ 
        success: true,
        message: "Password reset successfully!",
      });

    } catch (dbError) {
      logger.error("Database update failed:", dbError);
      return res.status(500).json({
        success: false,
        message: "Failed to update password",
      });
    }

  } catch (error) {
    logger.error("Unexpected error in changePassword:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
    });
  }
};

export const handleForgotPassword = async (req, res, next) => {
  try {
    const { token } = req.query;

    // Validate token presence
    if (!token) {
      return res.status(400).send(`
        <div style="text-align: center; padding: 2rem;">
          <h2 style="color: #dc3545;">Password Reset Error</h2>
          <p>Reset token is missing from the URL.</p>
          <p>Please request a new password reset link.</p>
        </div>
      `);
    }

    // Verify token with proper error handling
    let decoded;
    try {
      decoded = Jwt.verify(token, process.env.JWT_SECRET_KEY);
    } catch (err) {
      console.error('Token verification failed:', err.message);
      return res.status(400).send(`
        <div style="text-align: center; padding: 2rem;">
          <h2 style="color: #dc3545;">Invalid Reset Link</h2>
          <p>This password reset link is invalid or has expired.</p>
          <p>Please request a new password reset link.</p>
          <a href="/forgot-password" style="color: #007bff;">Request New Reset Link</a>
        </div>
      `);
    }

    // Render secure password reset form
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';">
        <title>Reset Password | ${process.env.APP_NAME}</title>
        <style>
          /* Your existing styles plus additional improvements */
          body {
            font-family: 'Segoe UI', system-ui, sans-serif;
            background-color: #f8f9fa;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            line-height: 1.6;
          }
          .reset-container {
            background: white;
            padding: 2.5rem;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
            width: 100%;
            max-width: 450px;
          }
          .password-rules {
            font-size: 0.85rem;
            color: #6c757d;
            margin: 0.5rem 0 1.5rem;
          }
          .error-message {
            color: #dc3545;
            font-size: 0.9rem;
            margin-top: -0.5rem;
            margin-bottom: 1rem;
            display: none;
          }
        </style>
      </head>
      <body>
        <div class="reset-container">
          <h2 style="text-align: center; margin-bottom: 1.5rem; color: #212529;">Reset Your Password</h2>
          
          <form id="resetForm" novalidate>
            <input type="hidden" name="token" value="${token}">
            
            <div style="margin-bottom: 1.5rem;">
              <label for="newPassword" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">New Password</label>
              <input type="password" id="newPassword" name="newPassword" 
                     required minlength="8" pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$"
                     style="width: 100%; padding: 0.75rem; border: 1px solid #ced4da; border-radius: 4px; font-size: 1rem;">
              <div class="error-message" id="passwordError"></div>
              <div class="password-rules">
                Password must contain at least 8 characters, including uppercase, lowercase, and a number.
              </div>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
              <label for="confirmPassword" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Confirm Password</label>
              <input type="password" id="confirmPassword" name="confirmPassword" 
                     required style="width: 100%; padding: 0.75rem; border: 1px solid #ced4da; border-radius: 4px; font-size: 1rem;">
              <div class="error-message" id="confirmError"></div>
            </div>
            
            <button type="submit" style="width: 100%; padding: 0.75rem; background-color:rgb(155, 17, 30); color: white; border: none; border-radius: 4px; font-size: 1rem; cursor: pointer; transition: background-color 0.2s;">
              Reset Password
            </button>
          </form>
        </div>

        <script>
          document.getElementById('resetForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Client-side validation
            const password = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const passwordError = document.getElementById('passwordError');
            const confirmError = document.getElementById('confirmError');
            
            // Reset errors
            passwordError.style.display = 'none';
            confirmError.style.display = 'none';
            
            // Validate password match
            if (password !== confirmPassword) {
              confirmError.textContent = 'Passwords do not match';
              confirmError.style.display = 'block';
              return;
            }
            
            // Validate password strength
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$/;
            if (!passwordRegex.test(password)) {
              passwordError.textContent = 'Password does not meet requirements';
              passwordError.style.display = 'block';
              return;
            }
            
            try {
              const response = await fetch('/api/auth/forgotPassword', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  token: e.target.token.value,
                  newPassword: password,
                  confirmPassword: confirmPassword
                })
              });
              
              const result = await response.json();
              
              if (!response.ok) {
                throw new Error(result.message || 'Password reset failed');
              }
              
              alert('Password reset successfully! You will now be redirected to login.');
              window.location.href = '${process.env.CLIENT_URL || '/'}';
            } catch (error) {
              alert(error.message || 'An error occurred. Please try again.');
              console.error('Password reset error:', error);
            }
          });
        </script>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('Password reset handler error:', err);
    return res.status(500).send(`
      <div style="text-align: center; padding: 2rem;">
        <h2 style="color: #dc3545;">System Error</h2>
        <p>An unexpected error occurred while processing your request.</p>
        <p>Please try again later or contact support.</p>
      </div>
    `);
  }
};