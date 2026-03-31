import { Router } from 'express';
import { getSalesSummary, getTopProducts, getPaymentMethodBreakdown, getDashboardKPIs } from '../controllers/reportController';
import { getForecast } from '../controllers/forecastController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate); // auth required, but no role restriction for dashboard

router.get('/kpis',         getDashboardKPIs);
router.get('/sales',        getSalesSummary);
router.get('/top-products', getTopProducts);
router.get('/payments',     getPaymentMethodBreakdown);
router.get('/forecast',     getForecast);

export default router;
