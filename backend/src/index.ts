import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import courtsRoutes from './routes/courts';
import reservationsRoutes from './routes/reservations';
import notificationsRoutes from './routes/notifications';
import reportsRoutes from './routes/reports';

dotenv.config();
const app = express();
const port = process.env.PORT || 4000;

app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api', courtsRoutes);
app.use('/api', reservationsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api', reportsRoutes);

app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
