import { Router } from 'express';
import {
  getProducts, getProductById, getProductByBarcode,
  createProduct, updateProduct, deleteProduct,
} from '../controllers/productController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', getProducts);
router.get('/barcode/:barcode', getProductByBarcode);
router.get('/:id', getProductById);
router.post('/', authorize('admin', 'inventory_manager'), createProduct);
router.put('/:id', authorize('admin', 'inventory_manager'), updateProduct);
router.delete('/:id', authorize('admin'), deleteProduct);

export default router;
