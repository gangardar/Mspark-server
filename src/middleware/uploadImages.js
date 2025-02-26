import multer from 'multer';
import fs from 'fs'

const location ='./storage/public/';

// Ensure the directory exists
const ensureDirectoryExists = (dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true }); // Create the directory recursively
    }
  };

  ensureDirectoryExists(location);

const storage = multer.diskStorage({
    destination : (req, file, cb) => {
        cb(null, location);
    },

    filename : (req, file, cb) => {
        const originalname = file.originalname;
        const fileName = originalname.replace(/\s+/g, "_");
        cb(null, 'IMG@'+Date.now()+'-'+fileName); // Generate unique file name
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if(!allowedTypes.includes(file.mimetype)){
        return cb(new Error('Only JPEG, PNG, and GIF images are allowed!'), false);
    }
    cb(null, true);
} 

export const upload = multer({
    storage, fileFilter,
    limits: { fileSize: 5 * 5 * 1024 * 1024 }
}
)
