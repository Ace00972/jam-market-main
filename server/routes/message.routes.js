// ═══════════════════════════════════════════════
//  JAM MARKET — server/routes/message.routes.js
// ═══════════════════════════════════════════════
const { Router } = require('express');
const { protect } = require('../middleware/auth');
const {
  sendMessage,
  getConversation,
  getInbox,
  getUnreadMessageCount,
  getMyServiceProvider,
} = require('../controllers/messageController');

const router = Router();
router.post('/',              protect, sendMessage);
router.get('/inbox',          protect, getInbox);
router.get('/unread-count',   protect, getUnreadMessageCount);
router.get('/my-provider',    protect, getMyServiceProvider);
router.get('/:userId',        protect, getConversation);

module.exports = router;