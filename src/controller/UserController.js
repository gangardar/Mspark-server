import User from "../models/User.js"
import bcrypt from 'bcrypt'

export const createUser = async (user) => {
    try{
    let isExist = await User.findOne({email : user.email})
    if(isExist) throw new Error("User with this email already exist!")
    user.password = await bcrypt.hash(user.password,10)
    const userObj = new User(user)
    return await userObj.save()  
    }catch(e){
        return new Error(e.message);
    }
    
}

export const getUser = async() => {
    try{
        return await User.find().sort('name')
    }catch(err){
        return new Error(err.message)
    }
}

export const getUserWithPagination = async(page, limit) => {
    try{
        const skip = (page - 1) * limit
        const users = await User.find().sort('name').skip(skip).limit(limit)
        const total = await User.countDocuments(); //Get total count of users
        return {
            users,
            total,
            totalPages: Math.ceil(total/limit),
            currentPage: page 
        }
    }catch(err){
        return new Error(err.message)
    }
}

export const getNotDeletedUserWithPagination = async(page, limit) => {
    try{
        const skip = (page - 1) * limit
        const users = await User.find({ isDeleted: false }).sort('name').skip(skip).limit(limit)
        const total = await User.countDocuments({ isDeleted: false }); //Get total count of users
        return {
            users,
            total,
            totalPages: Math.ceil(total/limit),
            currentPage: page 
        }
    }catch(err){
        return new Error(err.message)
    }
}

export const getNotDeletedUserWithPaginationWithRole = async(page, limit,role) => {
    try{
        const skip = (page - 1) * limit
        const users = await User.find({ isDeleted: false, role }).sort('name').skip(skip).limit(limit);
        const total = await User.countDocuments({ isDeleted: false, role });
        console.log(users)
        
        return {
            users,
            total,
            totalPages: Math.ceil(total/limit),
            currentPage: page 
        }
    }catch(err){
        return new Error(err.message)
    }
}

export const getUserById = async(id) => {
    try{
        return await User.find({_id : id})
    }catch(e){
        return new Error(e.message)
    }
}

export const authUser = async(email) => {
    try {
        return await User.findOne({email})
    } catch (err) {
        
    }
}

export const getMe = async(id) => {
    try{
        return await User.find({_id : id}).select('-password');
    }catch(err){
        return new Error(err.message);
    }
}

export const updateUser = async(id,body) => {
    try{
        return await User.findByIdAndUpdate(id,{$set : body}, {new : true})
    }catch(err){
        return new Error(err.message);
    }
}

export const deleteUser = async(id) => {
    try{
        return await User.findByIdAndDelete({_id : id})
    }catch(e){
        return new Error(e.message)
    }
}

//softdelete a gem
  export const softDeleteUser = async (id) => {
    try {
      const gem = await User.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
      if (!gem) return res.status(404).json({ success: false, message: "User not found" });
      res.status(200).json({ success: true, message: "User soft deleted", data: gem });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };