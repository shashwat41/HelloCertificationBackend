const express = require('express');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.options('*', cors());

const otpDatabase = new Map();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

transporter.verify(function(error, success) {
    if (error) {
        console.error('Mail transporter verification failed:', error);
    } else {
        console.log('Mail transporter is ready');
    }
});

const generateOTP = () => {
    return crypto.randomInt(100000, 999999).toString();
};

app.post('/api/generate-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ status: 'Failed', message: 'Email is required' });
    }

    const otp = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    otpDatabase.set(email, { otp, expiresAt });
    console.log(`OTP for ${email}: ${otp}`);

    try {
        await transporter.sendMail({
            from: `"Hello Certification" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '🎓 Welcome to Hello Certification - Verify Your Email',
            html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
                <div style="background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                    
                    <h1 style="color: #1a1a1a; font-size: 24px; margin: 0 0 10px 0; font-weight: 600;">Welcome to Hello Certification</h1>
                    <p style="color: #555; font-size: 15px; margin: 0 0 30px 0; line-height: 1.6;">We're glad to have you with us. You've just taken a strong step toward leveling up your skills, and we're here to help you grow with the right guidance, resources, and opportunities.</p>
                    
                    <div style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); padding: 30px; margin: 30px 0; border-radius: 8px; text-align: center;">
                        <p style="color: #ffffff; font-size: 13px; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Your Verification Code</p>
                        <h2 style="color: #ffffff; font-size: 42px; margin: 0; letter-spacing: 6px; font-weight: 700; font-family: 'Courier New', monospace;">${otp}</h2>
                        <p style="color: rgba(255,255,255,0.9); font-size: 12px; margin: 15px 0 0 0;">⏱️ Expires in 5 minutes</p>
                    </div>
                    
                    <p style="color: #555; font-size: 14px; margin: 30px 0 20px 0; line-height: 1.6;"><strong>To get started:</strong> Copy the code above and complete your email verification. This ensures your account stays secure.</p>
                    
                    <p style="color: #555; font-size: 14px; margin: 0 0 20px 0; line-height: 1.6;">Once you're verified, you'll be able to explore:</p>
                    
                    <ul style="color: #555; font-size: 14px; margin: 10px 0 20px 20px; padding: 0; line-height: 1.8;">
                        <li>📚 Curated learning paths designed for your goals</li>
                        <li>🛠️ Hands-on projects to apply your skills</li>
                        <li>⚡ Tools designed to help you upskill faster and smarter</li>
                    </ul>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    
                    <p style="color: #777; font-size: 12px; margin: 15px 0 0 0; line-height: 1.6;">If you didn't sign up for Hello Certification, you can safely ignore this email.</p>
                    
                    <p style="color: #333; font-size: 14px; margin: 20px 0 0 0; line-height: 1.6;">Looking forward to being a part of your growth journey.</p>
                    <p style="color: #333; font-size: 14px; margin: 10px 0 0 0; font-weight: 600;">— Team Hello Certification</p>
                </div>
                <p style="text-align: center; color: #999; font-size: 11px; margin-top: 25px; line-height: 1.6;">© 2026 Hello Certification. All rights reserved.<br>Your privacy is important to us.</p>
            </div>
            `
        });

        res.json({ status: 'Success', message: 'OTP sent successfully' });
    } catch (err) {
        console.error('Error sending OTP email:', err);
        res.status(500).json({ status: 'Failed', message: 'Email sending failed', error: err.message });
    }
});

app.post('/api/validate-otp', (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ status: 'Failed', message: 'Email and OTP required' });
    }

    const record = otpDatabase.get(email);

    if (!record) {
        return res.status(400).json({ status: 'Failed', message: 'OTP not found' });
    }

    if (Date.now() > record.expiresAt) {
        otpDatabase.delete(email);
        return res.status(400).json({ status: 'Failed', message: 'OTP expired' });
    }

    if (record.otp !== otp) {
        return res.status(400).json({ status: 'Failed', message: 'Invalid OTP' });
    }

    otpDatabase.delete(email);

    res.json({
        status: 'Success',
        username: email,
        userid: crypto.randomUUID(),
        credit: 0
    });
});

app.post('/api/send-payment-confirmation', async (req, res) => {
    const { email, selectedSource, courseName } = req.body;

    if (!email || !selectedSource) {
        return res.status(400).json({ status: 'Failed', message: 'Email and payment source are required' });
    }

    try {
        await transporter.sendMail({
            from: `"Hello Certification" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Payment Under Review - Welcome to Your Course',
            html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
                <div style="background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                    
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #1a1a1a; font-size: 28px; margin: 0 0 10px 0; font-weight: 600;">Payment Under Review</h1>
                        <p style="color: #28a745; font-size: 16px; margin: 0; font-weight: 600;">Thank you for your purchase!</p>
                    </div>
                    
                    <p style="color: #555; font-size: 15px; margin: 0 0 25px 0; line-height: 1.6;">We're thrilled you've chosen to invest in your growth with us. Thank you for selecting this course and becoming part of the Hello Certification community!</p>
                    
                    <div style="background-color: #f0f8ff; border-left: 4px solid #007bff; padding: 20px; margin: 25px 0; border-radius: 4px;">
                        <h3 style="color: #0056b3; margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">ORDER DETAILS</h3>
                        <div style="font-size: 14px; line-height: 1.8; color: #555;">
                            <p style="margin: 5px 0;"><strong>Course:</strong> ${courseName || 'Selected Course'}</p>
                            <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${selectedSource}</p>
                            <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #edf020; font-weight: 600;">✓ pending</span></p>
                        </div>
                    </div>
                    
                    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 25px 0; border-radius: 4px;">
                        <h3 style="color: #856404; margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">⏱️ CREDIT REFLECTION</h3>
                        <p style="color: #856404; font-size: 14px; margin: 0; line-height: 1.6;">Your course credits and access will be reflected in your account within <strong>a few hours to 24 hours</strong>. This timeframe allows us to process your payment securely and activate your course materials.</p>
                    </div>
                    
                    <div style="background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 20px; margin: 25px 0; border-radius: 4px;">
                        <h3 style="color: #2e7d32; margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">WHAT'S NEXT?</h3>
                        <ul style="color: #2e7d32; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
                            <li>📬 Check your email for course access details once processing is complete</li>
                            <li>🎓 Explore the curriculum and start learning at your own pace</li>
                            <li>💬 Join our community forum to connect with other learners</li>
                            <li>📞 Reach out to our support team if you have any questions</li>
                        </ul>
                    </div>
                    
                    <p style="color: #555; font-size: 14px; margin: 25px 0 10px 0; line-height: 1.6;">We're committed to your success. If you have any questions or need assistance, don't hesitate to reach out to our support team.</p>
                    
                    <p style="color: #555; font-size: 14px; margin: 0 0 25px 0; line-height: 1.6;">Happy learning! 🚀</p>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    
                    <p style="color: #333; font-size: 14px; margin: 15px 0 0 0; font-weight: 600;">— Team Hello Certification</p>
                </div>
                <p style="text-align: center; color: #999; font-size: 11px; margin-top: 25px; line-height: 1.6;">© 2026 Hello Certification. All rights reserved.<br>For questions, contact <a href="mailto:support@hellocertification.com" style="color: #007bff; text-decoration: none;">support@hellocertification.com</a></p>
            </div>
            `
        });

        res.json({ status: 'Success', message: 'Payment confirmation email sent successfully' });
    } catch (err) {
        console.error('Error sending payment confirmation email:', err);
        res.status(500).json({ status: 'Failed', message: 'Email sending failed', error: err.message });
    }
});

app.listen(PORT,'0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
