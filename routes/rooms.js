const express = require('express');
const { getRooms, createRoom, deleteRoom } = require('../controllers/rooms');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.route('/')
    .get(getRooms)
    .post(protect, authorize('owner', 'admin'), createRoom);

router.route('/:id')
    .delete(protect, authorize('owner', 'admin'), deleteRoom);

module.exports = router;
