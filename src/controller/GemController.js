import path from "path";
import Gem from "../models/Gem.js";
import fs from "fs";

// Create a new gem
export const createGem = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No files uploaded." });
    }
    const urls = req.files.map((file) => file.path);
    console.log(urls);
    const gem = new Gem({
      ...req.body,
      merchantId: req.user._id,
      images: urls,
    });
    await gem.save();
    res
      .status(201)
      .json({ success: true, message: "Gem Added Successfully", data: gem });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAllGems = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;
    const gems = await Gem.find()
      .skip(skip)
      .limit(limit)
      .populate("merchantId verifierId")
      .sort("name");
    if (!gems || (typeof gems === "object" && Object.keys(gems).length === 0)) {
      return res
        .status(404)
        .send({ success: false, message: "Empty. Not Found!", data: gems }); // Send 404 if gem not found
    }
    res
      .status(200)
      .json({ success: true, message: "Retrived Successfully!", data: gems });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getNotDeletedGems = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const gems = await Gem.find({ isDeleted: false })
      .skip(skip)
      .limit(limit)
      .populate("merchantId verifierId")
      .sort("name");
    if (!gems || (typeof gems === "object" && Object.keys(gems).length === 0)) {
      return res
        .status(404)
        .json({ success: false, message: "Empty. Not Found!", data: gems }); // Send 404 if gem not found
    }
    res.status(200).json({ success: true, message: "statusful", data: gems });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//Get deleted gems

export const getDeletedGems = async (req, res) => {
  try {
    const gems = await Gem.find({ isDeleted: true });
    res
      .status(200)
      .json({ success: true, message: "Retrived Successfully!", data: gems });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get a single gem by ID
export const getGemById = async (req, res) => {
  try {
    const gem = await Gem.findById(req.params.id).populate("merchantId");
    if (!gem)
      return res.status(404).json({ success: false, message: "Gem not found" });
    res
      .status(200)
      .json({ success: true, message: "Retrived Successfully!", data: gem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get gems by Merchant ID
export const getGemByMerchnatId = async (req, res) => {
  try {
    const filter = {
      merchantId: req.params.id,
      isDeleted: false,
    };
    if (req.query.status) {
      filter.status = req.query.status;
    }
    const gems = await Gem.find(filter)
      .sort({ createdAt: -1 })
      .populate("merchantId", "username email");
      
    if (!gems.length) { 
        return res.status(200).json({ 
          success: true, 
          message: "No gems found",
          data: [] 
        });
      }
  
    res
      .status(200)
      .json({ success: true, message: "Retrived Successfully!", data: gems });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get sold gems by Merchant ID
export const getSoldGemByMerchnatId = async (req, res) => {
  try {
    const gem = await Gem.find({
      merchantId: req.params.id,
      status: "sold",
      isDeleted: "false",
    });
    if (!gem)
      return res.status(404).json({ success: false, message: "Gem not found" });
    res
      .status(200)
      .json({
        success: true,
        message: "Sold Gem Retrived Successfully!",
        data: gem,
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get a single gems by its verifierId
export const getGemByVerifierId = async (req, res) => {
  try {
    const gem = await Gem.find({
      verifierId: req.params.id,
      isDeleted: "false",
    }).populate("verifierId merchantId");
    if (!gem)
      return res.status(404).json({ success: false, message: "Gem not found" });
    res
      .status(200)
      .json({ success: true, message: "Retrived Successfully!", data: gem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update a gem
export const updateGem = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the existing gem from the database
    const existingGem = await Gem.findById(id);
    if (!existingGem) {
      return res.status(404).json({ success: false, message: "Gem not found" });
    }

    // Get the existing images from the database
    const existingImages = existingGem.images || [];

    // Get the paths of newly uploaded files
    const newImageUrls = req.files ? req.files.map((file) => file.path) : [];

    // Combine existing images with new image URLs
    const updatedImages = [...existingImages, ...newImageUrls];

    // Create the updated gem object
    const updatedGem = {
      ...req.body, // Spread the rest of the body fields
      images: updatedImages, // Use the combined images array
    };
    // Update the gem in the database
    const gem = await Gem.findByIdAndUpdate(req.params.id, updatedGem, {
      new: true, // Return the updated document
      runValidators: true, // Run Mongoose validators
    });
    if (!gem)
      return res.status(404).json({ success: false, message: "Gem not found" });
    res
      .status(200)
      .json({ success: true, message: "Updated Successfully!", data: gem });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update a gem
export const verifyGem = async (req, res) => {
  try {
    const { id } = req.params;
    const { _id } = req.user;

    // Fetch the existing gem from the database
    const existingGem = await Gem.findById(id);
    if (!existingGem) {
      return res.status(404).json({ success: false, message: "Gem not found" });
    }

    // Update the status of the gem to "Verified"
    const updatedGem = await Gem.findByIdAndUpdate(
      id,
      { status: "verified", verifierId: _id },
      { new: true } // Return the updated document
    );

    if (!updatedGem) {
      return res.status(404).json({ success: false, message: "Gem not found" });
    }

    res.status(200).json({
      success: true,
      message: "Updated Successfully!",
      data: updatedGem,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update a gem
export const assignToMe = async (req, res) => {
  try {
    req.body.verifierId = req.user._id;
    const gem = await Gem.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!gem)
      return res.status(404).json({ success: false, message: "Gem not found" });
    res.status(200).json({
      success: true,
      message: `Assigned to ${req.user.username} Successfully!`,
      data: gem,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete a gem
export const deleteGem = async (req, res) => {
  try {
    const gem = await Gem.findByIdAndDelete(req.params.id);
    if (!gem)
      return res.status(404).json({ success: false, message: "Gem not found" });
    res
      .status(200)
      .json({ success: true, message: "Gem deleted statusfully", data: gem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
//softdelete a gem
export const softDeleteGem = async (req, res) => {
  try {
    const gem = await Gem.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );
    if (!gem)
      return res.status(404).json({ success: false, message: "Gem not found" });
    res
      .status(200)
      .json({ success: true, message: "Gem soft deleted", data: gem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteGemImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { url } = req.body;

    // Find the gem by ID
    const gem = await Gem.findById(id);
    if (!gem) {
      return res.status(404).json({ success: false, message: "Gem not found" });
    }
    const filename = path.basename(url);

    // Define the file path
    const filePath = path.join("./storage/public/", filename);
    console.log(filePath);

    // Check if the image exists in the images array
    if (!gem.images.includes(filePath)) {
      return res
        .status(404)
        .json({ success: false, message: "Image not found" });
    }

    // Extract the filename from the URL

    // Check if the file exists
    if (fs.existsSync(filePath)) {
      // Delete the file
      fs.unlinkSync(filePath);
    } else {
      return res
        .status(404)
        .json({ success: false, message: "File not found on server" });
    }

    // Filter out the image with the specified URL
    gem.images = gem.images.filter((img) => img !== filePath);

    console.log(gem);

    // Save the updated gem to the database
    await gem.save();

    // Respond with success message and updated gem
    res.status(200).json({
      success: true,
      message: "Image removed successfully",
      data: gem,
    });
  } catch (error) {
    // Handle errors
    res.status(500).json({ success: false, message: error.message });
  }
};

// restore deleted gem.
export const restoreGem = async (req, res) => {
  try {
    const gem = await Gem.findByIdAndUpdate(
      req.params.id,
      { isDeleted: false },
      { new: true }
    );
    if (!gem) {
      return res.status(404).json({ success: false, message: "Gem not found" });
    }
    res.status(200).json({ success: true, message: "Gem restored", data: gem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
