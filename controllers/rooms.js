const Room = require('../models/Room');
const CoworkingSpace = require('../models/CoworkingSpace');
const Reservation = require('../models/Reservation');
const sendEmail = require('../utils/email');

const isOwnerOfSpace = (space, userId) =>
    space && space.owner && space.owner.toString() === userId;

//@desc   List rooms (optionally scoped to a coworking space)
//@route  GET /api/v1/rooms
//@route  GET /api/v1/coworkingSpaces/:coworkingSpaceId/rooms
//@access Public
exports.getRooms = async (req, res) => {
    try {
        const filter = {};
        if (req.params.coworkingSpaceId) {
            filter.coworkingSpace = req.params.coworkingSpaceId;
        }
        const rooms = await Room.find(filter);
        res.status(200).json({ success: true, count: rooms.length, data: rooms });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: 'Cannot list rooms' });
    }
};

//@desc   Create a room (stub — belongs to US1-4; included so US1-6 is testable end-to-end)
//@route  POST /api/v1/coworkingSpaces/:coworkingSpaceId/rooms
//@access Private (owner of the space, or admin)
exports.createRoom = async (req, res) => {
    try {
        if (!req.params.coworkingSpaceId) {
            return res.status(400).json({ success: false, message: 'coworkingSpaceId is required' });
        }
        const space = await CoworkingSpace.findById(req.params.coworkingSpaceId);
        if (!space) {
            return res.status(404).json({ success: false, message: 'Coworking space not found' });
        }
        if (req.user.role !== 'admin' && !isOwnerOfSpace(space, req.user.id)) {
            return res.status(403).json({ success: false, message: 'Not authorized to add rooms to this space' });
        }
        req.body.coworkingSpace = req.params.coworkingSpaceId;
        const room = await Room.create(req.body);
        res.status(201).json({ success: true, data: room });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: 'Cannot create room' });
    }
};

//@desc   Delete a room. Cancels all associated reservations and notifies affected users. (US1-6)
//@route  DELETE /api/v1/rooms/:id
//@access Private (owner of the space, or admin)
exports.deleteRoom = async (req, res) => {
    try {
        const room = await Room.findById(req.params.id).populate({
            path: 'coworkingSpace',
            select: 'name owner'
        });

        if (!room) {
            return res.status(404).json({ success: false, message: `No Room with the id of ${req.params.id}` });
        }

        if (req.user.role !== 'admin' && !isOwnerOfSpace(room.coworkingSpace, req.user.id)) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this room' });
        }

        const affectedReservations = await Reservation.find({ room: room._id }).populate({
            path: 'user',
            select: 'name email'
        });

        await Reservation.deleteMany({ room: room._id });
        await Room.deleteOne({ _id: room._id });

        const spaceName = room.coworkingSpace ? room.coworkingSpace.name : '';
        const notifications = affectedReservations
            .filter((resv) => resv.user && resv.user.email)
            .map((resv) => sendEmail({
                to: resv.user.email,
                subject: 'Your reservation has been cancelled',
                html: `
                    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
                        <h2 style="color:#DC2626">Reservation Cancelled</h2>
                        <p>Hi <strong>${resv.user.name}</strong>,</p>
                        <p>The room <strong>${room.name}</strong> at <strong>${spaceName}</strong> has been removed by the space owner, so your reservation has been cancelled.</p>
                        <table style="width:100%;border-collapse:collapse;margin:16px 0">
                            <tr><td style="padding:8px;color:#64748B">Original Date &amp; Time</td><td style="padding:8px"><strong>${new Date(resv.apptDate).toLocaleString('en-GB')} - ${new Date(resv.apptEnd).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</strong></td></tr>
                            <tr><td style="padding:8px;color:#64748B">Booking ID</td><td style="padding:8px">${resv._id}</td></tr>
                        </table>
                        <p style="color:#64748B;font-size:14px">Please visit the platform to book a different room.</p>
                    </div>
                `
            }));

        await Promise.allSettled(notifications);

        res.status(200).json({
            success: true,
            data: {
                roomId: req.params.id,
                cancelledReservations: affectedReservations.length,
                notifiedUsers: notifications.length
            }
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: 'Cannot delete Room' });
    }
};
