const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');
const db = require('../database/connection');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    const uploadPath = path.join(uploadsDir, 'images', String(year), month, day);
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter for images
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
    files: 1
  }
});

// Upload single image
router.post('/image', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { width, height, quality, format } = req.body;
    const inputPath = req.file.path;
    const originalName = req.file.originalname;
    const fileSize = req.file.size;

    // Process image if parameters are provided
    let processedPath = inputPath;
    let processedFileName = path.basename(inputPath);

    if (width || height || quality || format) {
      const image = sharp(inputPath);
      
      // Resize if dimensions provided
      if (width || height) {
        image.resize(parseInt(width) || null, parseInt(height) || null, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Set quality for JPEG/WebP
      if (quality && (format === 'jpeg' || format === 'webp')) {
        image[format]({ quality: parseInt(quality) });
      } else if (quality && format === 'png') {
        image.png({ quality: parseInt(quality) });
      }

      // Convert format if specified
      if (format) {
        const outputFormat = format === 'jpeg' ? 'jpg' : format;
        const outputDir = path.dirname(inputPath);
        processedFileName = path.basename(inputPath, path.extname(inputPath)) + '.' + outputFormat;
        processedPath = path.join(outputDir, processedFileName);
        
        await image.toFile(processedPath);
        
        // Remove original file if format was changed
        if (processedPath !== inputPath) {
          fs.unlinkSync(inputPath);
        }
      } else {
        await image.toFile(processedPath);
      }
    }

    // Get relative path for URL
    const relativePath = path.relative(uploadsDir, processedPath);
    const imageUrl = `/uploads/${relativePath.replace(/\\/g, '/')}`;

    // Get image metadata
    const metadata = await sharp(processedPath).metadata();

    // Log upload for analytics
    await db.query(
      `INSERT INTO search_history (user_id, query, data)
       VALUES ($1, $2, $3)`,
      [
        req.user.id,
        'image_upload',
        JSON.stringify({
          filename: processedFileName,
          originalName,
          fileSize,
          dimensions: {
            width: metadata.width,
            height: metadata.height
          },
          format: metadata.format,
          path: relativePath
        })
      ]
    );

    res.json({
      message: 'Image uploaded successfully',
      image: {
        url: imageUrl,
        filename: processedFileName,
        originalName,
        fileSize,
        dimensions: {
          width: metadata.width,
          height: metadata.height
        },
        format: metadata.format,
        uploadedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Image upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Server error while uploading image' });
  }
});

// Upload multiple images
router.post('/images', auth, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No image files provided' });
    }

    const { width, height, quality, format } = req.body;
    const uploadedImages = [];

    for (const file of req.files) {
      try {
        const inputPath = file.path;
        const originalName = file.originalname;
        const fileSize = file.size;

        // Process image if parameters are provided
        let processedPath = inputPath;
        let processedFileName = path.basename(inputPath);

        if (width || height || quality || format) {
          const image = sharp(inputPath);
          
          // Resize if dimensions provided
          if (width || height) {
            image.resize(parseInt(width) || null, parseInt(height) || null, {
              fit: 'inside',
              withoutEnlargement: true
            });
          }

          // Set quality for JPEG/WebP
          if (quality && (format === 'jpeg' || format === 'webp')) {
            image[format]({ quality: parseInt(quality) });
          } else if (quality && format === 'png') {
            image.png({ quality: parseInt(quality) });
          }

          // Convert format if specified
          if (format) {
            const outputFormat = format === 'jpeg' ? 'jpg' : format;
            const outputDir = path.dirname(inputPath);
            processedFileName = path.basename(inputPath, path.extname(inputPath)) + '.' + outputFormat;
            processedPath = path.join(outputDir, processedFileName);
            
            await image.toFile(processedPath);
            
            // Remove original file if format was changed
            if (processedPath !== inputPath) {
              fs.unlinkSync(inputPath);
            }
          } else {
            await image.toFile(processedPath);
          }
        }

        // Get relative path for URL
        const relativePath = path.relative(uploadsDir, processedPath);
        const imageUrl = `/uploads/${relativePath.replace(/\\/g, '/')}`;

        // Get image metadata
        const metadata = await sharp(processedPath).metadata();

        uploadedImages.push({
          url: imageUrl,
          filename: processedFileName,
          originalName,
          fileSize,
          dimensions: {
            width: metadata.width,
            height: metadata.height
          },
          format: metadata.format,
          uploadedAt: new Date().toISOString()
        });

      } catch (error) {
        console.error(`Error processing image ${file.originalname}:`, error);
        
        // Clean up file on error
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }

    if (uploadedImages.length === 0) {
      return res.status(500).json({ error: 'Failed to process any images' });
    }

    res.json({
      message: `${uploadedImages.length} images uploaded successfully`,
      images: uploadedImages
    });

  } catch (error) {
    console.error('Multiple images upload error:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    res.status(500).json({ error: 'Server error while uploading images' });
  }
});

// Delete uploaded image
router.delete('/image/:filename', auth, async (req, res) => {
  try {
    const { filename } = req.params;
    const { path: filePath } = req.query;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    // Construct full file path
    const fullPath = path.join(uploadsDir, filePath);

    // Security check: ensure file is within uploads directory
    if (!fullPath.startsWith(uploadsDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete file
    fs.unlinkSync(fullPath);

    // Try to remove empty directories
    let currentDir = path.dirname(fullPath);
    while (currentDir !== uploadsDir && fs.readdirSync(currentDir).length === 0) {
      fs.rmdirSync(currentDir);
      currentDir = path.dirname(currentDir);
    }

    res.json({ message: 'Image deleted successfully' });

  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ error: 'Server error while deleting image' });
  }
});

// Get image info
router.get('/image/:filename', auth, async (req, res) => {
  try {
    const { filename } = req.params;
    const { path: filePath } = req.query;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    // Construct full file path
    const fullPath = path.join(uploadsDir, filePath);

    // Security check: ensure file is within uploads directory
    if (!fullPath.startsWith(uploadsDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Get file stats
    const stats = fs.statSync(fullPath);
    const metadata = await sharp(fullPath).metadata();

    res.json({
      filename,
      fileSize: stats.size,
      uploadedAt: stats.birthtime,
      modifiedAt: stats.mtime,
      dimensions: {
        width: metadata.width,
        height: metadata.height
      },
      format: metadata.format,
      url: `/uploads/${filePath.replace(/\\/g, '/')}`
    });

  } catch (error) {
    console.error('Get image info error:', error);
    res.status(500).json({ error: 'Server error while getting image info' });
  }
});

// Get user's uploaded images
router.get('/my-images', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Get user's upload history from search_history
    const result = await db.query(
      `SELECT query, data, created_at
       FROM search_history
       WHERE user_id = $1 AND query = 'image_upload'
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, parseInt(limit), offset]
    );

    const images = result.rows.map(row => {
      const imageData = JSON.parse(row.data);
      return {
        ...imageData,
        uploadedAt: row.created_at
      };
    });

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) FROM search_history
       WHERE user_id = $1 AND query = 'image_upload'`,
      [req.user.id]
    );

    const totalImages = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalImages / limit);

    res.json({
      images,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalImages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get user images error:', error);
    res.status(500).json({ error: 'Server error while fetching user images' });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected file field' });
    }
  }
  
  if (error.message.includes('Only image files are allowed')) {
    return res.status(400).json({ error: error.message });
  }
  
  console.error('Upload error:', error);
  res.status(500).json({ error: 'Server error during upload' });
});

module.exports = router;


