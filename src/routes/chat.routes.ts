import express from 'express';

import { protect } from '../controllers/auth.controller';
import {
    createChat,
    getMyChats,
    getChannels,
    getChat,
    updateChat,
    markChatAsRead,
    addParticipant,
    removeParticipant,
} from '../controllers/chat.controller';
import { getMessages, sendMessage } from '../controllers/message.controller';
import validate from '../middleware/validate';
import { uploadChatImage } from '../middleware/upload';
import {
    createChatSchema,
    updateChatSchema,
    addParticipantSchema,
    sendMessageSchema,
} from '../validation/chat.validation';

const router = express.Router();

router.use(protect);

router.post('/', validate(createChatSchema), createChat);
router.get('/', getMyChats);
router.get('/channels', getChannels);

router
    .route('/:id')
    .get(getChat)
    .patch(uploadChatImage, validate(updateChatSchema), updateChat);

router.post('/:id/read', markChatAsRead);

router.post('/:id/participants', validate(addParticipantSchema), addParticipant);
router.delete('/:id/participants/:userId', removeParticipant);

router
    .route('/:id/messages')
    .get(getMessages)
    .post(validate(sendMessageSchema), sendMessage);

export default router;
