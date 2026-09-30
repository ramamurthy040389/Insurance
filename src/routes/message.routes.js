const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const { validateCreateMessage } = require('../validators/message.validator');

// POST /api/v1/messages
router.post('/', validateCreateMessage, messageController.createMessage);

// GET /api/v1/messages (List scheduled messages with pagination, all=true, date range, search)
router.get('/', messageController.getMessages);

module.exports = router;
