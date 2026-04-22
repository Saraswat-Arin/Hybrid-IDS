import express from 'express';
import cors from 'cors';
import { IdsEngine } from './IdsEngine';

const app = express();
app.use(cors());
app.use(express.json());

const engine = new IdsEngine();

const router = express.Router();

router.get('/state', (req, res) => {
  res.json(engine.getState());
});

router.post('/start', (req, res) => {
  engine.start();
  res.json({ success: true, monitoring: engine.getState().monitoring });
});

router.post('/stop', (req, res) => {
  engine.stop();
  res.json({ success: true, monitoring: engine.getState().monitoring });
});

router.post('/simulate', (req, res) => {
  engine.simulateAttack();
  res.json({ success: true });
});

router.post('/reset', (req, res) => {
  engine.reset();
  res.json({ success: true });
});

app.use('/api/ids', router);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`IDS Backend listening on port ${PORT}`);
});
