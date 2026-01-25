import express from 'express';
import { listMentors, getSectors, getMentorById, getMentorsReviews} from '../controllers/mentors_controllers.js';

const router = express.Router();

router.post('/search', listMentors);
router.get('/get-sector', getSectors);
router.get('/get-mentor/:id', getMentorById);
router.get('/reviews/:mentorId', getMentorsReviews);


export default router;