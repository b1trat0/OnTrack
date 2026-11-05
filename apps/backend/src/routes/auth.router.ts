import { Hono } from 'hono'
import { authVerify } from '../middleware/auth'
import { authRateLimit } from '../middleware/rate-limit'
import * as ctrl from '../controllers/auth.controller'

const authRouter = new Hono()

authRouter.post('/signup', authRateLimit, ctrl.handleSignup)
authRouter.post('/signin', authRateLimit, ctrl.handleSignin)
authRouter.post('/refresh', authRateLimit, ctrl.handleRefresh)
authRouter.get('/verify-email', ctrl.handleVerifyEmail)
authRouter.post('/verify-email/resend', authRateLimit, ctrl.handleResendVerification)
authRouter.post('/forgot-password', authRateLimit, ctrl.handleForgotPassword)
authRouter.post('/reset-password', authRateLimit, ctrl.handleResetPassword)

authRouter.use('/me', authVerify)
authRouter.get('/me', ctrl.handleMe)
authRouter.patch('/me', ctrl.handleUpdateProfile)
authRouter.delete('/me', authRateLimit, ctrl.handleDeleteAccount)
authRouter.patch('/password', ctrl.handleChangePassword)
authRouter.get('/export', authVerify, ctrl.handleExportAccount)
authRouter.post('/signout', authVerify, ctrl.handleSignout)

export default authRouter