const express = require('express');
const router = express.Router();
const verifyShopifyHmac = require('../middleware/verifyShopifyHmac');
const webhookController = require('../controllers/webhookController');

router.post('/checkout', verifyShopifyHmac, webhookController.handleCheckout);
router.post('/order', verifyShopifyHmac, webhookController.handleOrder);
router.post('/customer', verifyShopifyHmac, webhookController.handleCustomer);

module.exports = router;
