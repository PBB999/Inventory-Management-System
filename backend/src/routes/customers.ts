import { Router } from 'express';
import {
  getCustomers, getCustomerById, getCustomerByPhone,
  createCustomer, updateCustomer, getTopCustomers,
} from '../controllers/customerController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', getCustomers);
router.get('/top', getTopCustomers);
router.get('/phone/:phone', getCustomerByPhone);
router.get('/:id', getCustomerById);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);

export default router;
