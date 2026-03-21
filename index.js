import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fileRouter from './routes/file.routes.js';
import accountRouter from './routes/account.routes.js';
import assessmentRouter from './routes/assessment.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api/v1", fileRouter);
app.use('/api/v1', accountRouter);
app.use('/api/v1', assessmentRouter);

app.listen(PORT, () => {
    console.log(`server listening to port ${PORT}`);
})