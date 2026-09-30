const multer = require('multer');
const path = require('path');
const fs = require('fs');
const env = require('../config/env');
const ApiError = require('../utils/apiError');

// Ensure temporary upload directory exists
const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Disk Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `import-${uniqueSuffix}${ext}`);
  }
});

// File filter accepting only CSV, XLSX, XLS
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.csv', '.xlsx', '.xls'];
  const allowedMimetypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream',
    'text/plain'
  ];

  if (allowedExtensions.includes(ext) || allowedMimetypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(ApiError.badRequest(`Invalid file type '${ext}'. Only CSV and Excel (.xlsx, .xls) files are supported.`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_FILE_SIZE_BYTES
  }
});

module.exports = upload;
