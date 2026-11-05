import { Hono } from 'hono'
import { authVerify } from '../middleware/auth'
import * as ctrl from '../controllers/billing.controller'

const billingRouter = new Hono()

billingRouter.get('/plans', ctrl.handlePlans)
billingRouter.post('/webhook', ctrl.handleWebhook)

billingRouter.get('/status', authVerify, ctrl.handleBillingStatus)
billingRouter.post('/checkout', authVerify, ctrl.handleCheckout)
billingRouter.post('/portal', authVerify, ctrl.handlePortal)

export default billingRouter
