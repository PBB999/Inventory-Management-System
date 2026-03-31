import { Router } from 'express';
import { createOrder, getOrders, getOrderById, refundOrder, syncOfflineOrders } from '../controllers/orderController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', getOrders);
router.post('/', createOrder);
router.get('/:id', getOrderById);
router.patch('/:id/refund', authorize('admin', 'inventory_manager'), refundOrder);
router.post('/sync-offline', syncOfflineOrders);

export default router;
