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
            subject: 'Your OTP Code',
            html: `<h2>Your OTP is ${otp}</h2><p>Expires in 5 minutes</p>`
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

app.listen(PORT,'0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
