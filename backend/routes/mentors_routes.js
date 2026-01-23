import express from 'express';
import { listMentors } from '../controllers/mentors_controllers.js';

const router = express.Router();

router.get('/', listMentors);

export default router;