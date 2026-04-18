const express = require('express');
const {
    submitRequest,
    getMyRequests,
    getMyRequest
} = require('../controllers/coworkingSpaceRequests');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.route('/').post(protect, submitRequest);
router.route('/mine').get(protect, getMyRequests);
router.route('/mine/:id').get(protect, getMyRequest);

module.exports = router;
