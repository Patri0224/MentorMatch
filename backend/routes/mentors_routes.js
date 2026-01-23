import express from 'express';
import { listMentors, getSectors } from '../controllers/mentors_controllers.js';

const router = express.Router();

router.get('/search', listMentors);
router.get('/get-sector', getSectors);


export default router;