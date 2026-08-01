import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patient.js';
import doctorRoutes from './routes/doctor.js';
import globalRoutes from './routes/global.js';
import { errorHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Accept both local dev and any production Cloudflare Pages domain
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
  // Allow *.pages.dev subdomains for Cloudflare Pages preview deployments
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      /\.pages\.dev$/.test(origin)      // any Cloudflare Pages preview
    ) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' })); // allow base64 signature images

// Static files – ordonnance PDFs
app.use('/ordonnances', express.static(path.join(__dirname, '../../public/ordonnances')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/global', globalRoutes);

app.use(errorHandler);

export default app;
