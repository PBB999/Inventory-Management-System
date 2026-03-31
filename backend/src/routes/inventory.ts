import { Router } from 'express';
import {
  getInventory, getInventoryByStore, adjustStock,
  transferStock, getLowStockAlerts,
} from '../controllers/inventoryController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', getInventory);
router.get('/low-stock', getLowStockAlerts);
router.get('/store/:storeId', getInventoryByStore);
router.post('/adjust', authorize('admin', 'inventory_manager'), adjustStock);
router.post('/transfer', authorize('admin', 'inventory_manager'), transferStock);

export default router;
