const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { sendEmail } = require('../utils/email');
const { renderTemplate } = require('../utils/renderTemplate');

function genOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** REGISTER USER **/
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already in use' });

    const user = await User.create({ name, email, password });

    const otp = genOTP();
    user.otpCode = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    // Send only OTP mail here — not the welcome mail yet
    try {
      const otpHtml = renderTemplate('otp', { otp });
      await sendEmail({ to: user.email, subject: 'Your Streamify OTP', html: otpHtml });
    } catch (e) {
      console.error('OTP email failed:', e.message);
    }

    const token = generateToken(user._id);
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
      },
      needsVerification: true,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** LOGIN **/
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** VERIFY OTP **/
exports.verifyOtp = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });

    if (!user || !user.otpCode) return res.status(400).json({ message: 'Invalid request' });
    if (user.otpCode !== code) return res.status(400).json({ message: 'Invalid code' });
    if (user.otpExpires && user.otpExpires < new Date()) return res.status(400).json({ message: 'Code expired' });

    // Clear OTP after successful verification
    user.otpCode = null;
    user.otpExpires = null;
    await user.save();

    // Send Welcome Email 
    try {
      const welcomeHtml = renderTemplate('welcome', { name: user.name });
      await sendEmail({
        to: user.email,
        subject: 'Welcome to Streamify',
        html: welcomeHtml,
      });
      console.log(`Welcome email sent to ${user.email}`);
    } catch (mailErr) {
      console.error('Welcome email failed:', mailErr.message);
    }

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** RESEND OTP **/
exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const otp = genOTP();
    user.otpCode = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    try {
      const otpHtml = renderTemplate('otp', { otp });
      await sendEmail({
        to: user.email,
        subject: 'Your Streamify OTP',
        html: otpHtml,
      });
      console.log(`OTP email sent to ${user.email}`);
      res.json({ message: 'OTP sent successfully' });
    } catch (mailErr) {
      console.error('Resend OTP email failed:', mailErr.message);
      res.status(200).json({
        message:
          'OTP regenerated successfully, but email sending failed. Please verify your SMTP settings.',
      });
    }
  } catch (err) {
    console.error('Resend OTP error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/** SEND RESET OTP **/
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "No user found with this email" });

    const otp = genOTP();
    user.otpCode = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const html = renderTemplate("forgetmail", { otp });
    await sendEmail({
      to: user.email,
      subject: "Your Streamify Password Reset OTP",
      html,
    });

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** VERIFY OTP + RESET PASSWORD **/
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user || user.otpCode !== code)
      return res.status(400).json({ message: "Invalid OTP or email" });
    if (user.otpExpires < new Date())
      return res.status(400).json({ message: "OTP expired" });

    user.password = newPassword;
    user.otpCode = null;
    user.otpExpires = null;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

