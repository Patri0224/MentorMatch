import express from 'express';
import cors from 'cors';

import authRoutes from '../routes/auth_routes.js';
import usersRoutes from '../routes/users_routes.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

app.listen(3000, () => console.log("Server in ascolto sulla porta 3000"));

export default app;