import Gem from "../models/Gem.js";

// Create a new gem
export const createGem = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({status: false, message :'No files uploaded.'});
    }
    const urls = req.files.map((file) => file.path)
    const gem = new Gem({ ...req.body, merchantId: req.user._id, images : `/${urls}` });
    await gem.save();
    res.status(201).json({ status: true, message: "Gem Added Successfully", data: gem });
  } catch (error) {
    res.status(400).json({ status: false, message: error.message });
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
      .populate("merchantId")
      .sort("name");
    if (!gems || (typeof gems === "object" && Object.keys(gems).length === 0)) {
      return res.status(404).send({status : false ,message : "Empty. Not Found!", data : gems}); // Send 404 if gem not found
    }
    res.status(200).json({ status: true,message : "Retrived Successfully!", data: gems });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
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
      .populate("merchantId")
      .sort("name");
    if (!gems || (typeof gems === "object" && Object.keys(gems).length === 0)) {
      return res.status(404).json({status : false ,message : "Empty. Not Found!", data : gems}); // Send 404 if gem not found
    }
    res.status(200).json({ status: true, message : "statusful", data: gems });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

//Get deleted gems

export const getDeletedGems = async (req, res) => {
  try {
    const gems = await Gem.find({ isDeleted: true });
    res.status(200).json({ status: true, message: "Retrived Successfully!", data: gems });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// Get a single gem by ID
export const getGemById = async (req, res) => {
  try {
    const gem = await Gem.findById(req.params.id).populate("merchantId");
    if (!gem)
      return res.status(404).json({ status: false, message: "Gem not found" });
    res.status(200).json({ status: true, message: "Retrived Successfully!", data: gem });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// Update a gem
export const updateGem = async (req, res) => {
  try {
    const gem = await Gem.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    });
    if (!gem)
      return res.status(404).json({ status: false, message: "Gem not found" });
    res.status(200).json({ status: true,message : "Retrived Successfully!", data: gem });
  } catch (error) {
    res.status(400).json({ status: false, message: error.message });
  }
};

// Delete a gem
export const deleteGem = async (req, res) => {
  try {
    const gem = await Gem.findByIdAndDelete(req.params.id);
    if (!gem)
      return res.status(404).json({ status: false, message: "Gem not found" });
    res
      .status(200)
      .json({ status: true, message: "Gem deleted statusfully", data : gem });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
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
      return res.status(404).json({ status: false, message: "Gem not found" });
    res
      .status(200)
      .json({ status: true, message: "Gem soft deleted", data: gem });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
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
    if (!gem){
        return res.status(404).json({ status: false, message: "Gem not found" });
    }
    res.status(200).json({ status: true, message: "Gem restored", data: gem });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};
