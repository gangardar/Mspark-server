import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
    country : {
        type : String,
        require : true,
        trim : true
    },
    state : {
        type : String,
        require : true
    },
    city : {
        type : String,
        require : true
    },
    street : {
        type : String,
        require : true
    },
    houseNo : {
        type : String,
        require : true
    },
    postalcode : {
        type : String,
        require : true
    },
    user : {
        type : mongoose.Schema.Types.ObjectId,
        unique : true,
        ref : 'Users',
    }
});

export default mongoose.model('Address',addressSchema)
