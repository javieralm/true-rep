-- El pipeline de OpenAI Vision es la pieza más cara y menos validada del
-- producto (CEO review, 2026-07-31): un trainer debe aprobar el análisis
-- automático antes de que corra, en vez de dispararse solo en cada upload.
ALTER TYPE "AnalysisStatus" ADD VALUE 'PENDING_TRAINER_REVIEW';
