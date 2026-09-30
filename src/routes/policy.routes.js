const express = require('express');
const router = express.Router();
const policyController = require('../controllers/policy.controller');
const upload = require('../middleware/upload');
const { validateSearchQuery, validateSummaryQuery } = require('../validators/policy.validator');

// POST /api/v1/policies/import & /upload (Multipart upload processed via Worker Thread)
router.post('/import', upload.single('file'), policyController.importPolicies);
router.post('/upload', upload.single('file'), policyController.importPolicies);
router.post('/check-duplicates', upload.single('file'), policyController.checkDuplicates);

// GET /api/v1/policies (List all policies with pagination, all=true, date range, search)
router.get('/', policyController.getPolicies);

// GET /api/v1/policies/search?username=<username>
router.get('/search', validateSearchQuery, policyController.searchByUser);

// GET /api/v1/policies/summary
router.get('/summary', validateSummaryQuery, policyController.getSummary);

// GET /api/v1/policies/categories (List all policy categories / LOBs)
router.get('/categories', policyController.getCategories);

// GET /api/v1/policies/carriers (List all policy carriers / insurance companies)
router.get('/carriers', policyController.getCarriers);

module.exports = router;
