// ═══════════════════════════════════════════════
//  JAM MARKET — server/routes/message.routes.js
// ═══════════════════════════════════════════════
const { Router } = require('express');
const { protect } = require('../middleware/auth');
const { sendMessage, getConversation, getInbox } = require('../controllers/messageController');

const router = Router();
router.post('/',       protect, sendMessage);
router.get('/inbox',   protect, getInbox);
router.get('/:userId', protect, getConversation);

module.exports = router;