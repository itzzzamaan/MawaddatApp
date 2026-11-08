const express = require("express");
const router = express.Router();
const Admin = require("../models/Admin");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const firebaseAuth = require("firebase-admin/auth");
const firebaseAdmin = require("../firebaseAdmin");
const {
  sendOtpEmail,
  getOtpDeliveryError,
  maskEmail,
} = require("../utils/email");
const {
  issueOtp,
  discardOtp,
  verifyOtp,
  consumeSession,
  createIpLimiter,
  shouldExposeOtp,
} = require("../utils/otp");
const googleOAuthClient = new OAuth2Client();

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const otpSendLimiter = createIpLimiter({ windowMs: 10 * 60 * 1000, max: 20 });
const otpVerifyLimiter = createIpLimiter({ windowMs: 10 * 60 * 1000, max: 60 });

const pendingOtps = new Map();
const pendingPasswordResets = new Map();
const passwordResetTokens = new Map();

const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

const getOtpMessage = (email, otp, purpose) => {
  const isPasswordReset = purpose === "password-reset";
  return {
    to: email,
    subject: isPasswordReset
      ? "Reset your Mawaddat password"
      : "Your Mawaddat signup OTP",
    html: `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
        <h2 style="margin-bottom: 12px;">${isPasswordReset ? "Password reset code" : "Your verification code"}</h2>
        <p>${isPasswordReset ? "Use this code to reset your Mawaddat password." : "Use the code below to complete your signup."}</p>
        <div style="font-size: 32px; letter-spacing: 6px; font-weight: 700; margin: 18px 0; padding: 16px 20px; background: #f3f4f6; border-radius: 10px; display: inline-block;">
          ${otp}
        </div>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  };
};

const sendOtpWithResend = async (email, otp, purpose) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.SMTP_FROM,
      ...getOtpMessage(email, otp, purpose),
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const error = new Error("Email provider rejected the OTP message.");
    error.code = "EMAIL_PROVIDER_REJECTED";
    error.status = response.status;
    throw error;
  }
};

const getTransporter = () => {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS?.replace(/\s/g, "");

  if (!user || !pass) {
    const error = new Error("SMTP_USER and SMTP_PASS must be configured.");
    error.code = "SMTP_NOT_CONFIGURED";
    throw error;
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    const error = new Error("SMTP_PORT must be a valid port number.");
    error.code = "SMTP_INVALID_PORT";
    throw error;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    // Fail fast: Render's free tier silently drops outbound SMTP, and nodemailer's
    // defaults (2 min connect / 10 min socket) would hang the request until timeout.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user,
      pass,
    },
  });
};

const normalizeEmail = (email) =>
  String(email || "")
    .trim()
    .toLowerCase();
const normalizeOtp = (otp) => String(otp || "").replace(/\s/g, "");

const signUserToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email, role: "user" },
    process.env.JWT_SECRET || "change_this_secret",
    { expiresIn: "7d" },
  );

// Issues an OTP, emails it and rolls the OTP back if delivery fails.
// A decoy (unknown account) goes through the same rate limits but sends nothing.
const issueAndSendOtp = async ({
  email,
  purpose,
  decoy = false,
  ...payload
}) => {
  const issued = await issueOtp({ email, purpose, decoy, ...payload });
  if (!decoy) {
    try {
      await sendOtpEmail(email, issued.otp, purpose);
    } catch (error) {
      await discardOtp(email, purpose);
      throw error;
    }
  }
  return {
    expiresInSeconds: issued.expiresInSeconds,
    resendAfterSeconds: issued.resendAfterSeconds,
    otp: shouldExposeOtp() ? issued.otp : undefined,
  };
};

const isOtpError = (err) =>
  err.status && String(err.code || "").startsWith("OTP_");

const sendOtpFailure = (res, err) => {
  if (isOtpError(err)) {
    if (err.retryAfter) res.set("Retry-After", String(err.retryAfter));
    return res.status(err.status).json({
      message: err.message,
      code: err.code,
      retryAfter: err.retryAfter,
    });
  }
  const deliveryError = getOtpDeliveryError(err);
  return res
    .status(deliveryError.status)
    .json({ message: deliveryError.message });
};

const RESET_GENERIC_MESSAGE =
  "If an account exists for that email, a verification code has been sent.";

router.post("/forgot-password/send-otp", otpSendLimiter, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email || !EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    const user = await User.findOne({ email });
    const result = await issueAndSendOtp({
      email,
      purpose: "password-reset",
      decoy: !user,
    });

    return res.status(200).json({
      message: RESET_GENERIC_MESSAGE,
      expiresInSeconds: result.expiresInSeconds,
      resendAfterSeconds: result.resendAfterSeconds,
      otp: user ? result.otp : undefined,
    });
  } catch (err) {
    return sendOtpFailure(res, err);
  }
});

router.post(
  "/forgot-password/verify-otp",
  otpVerifyLimiter,
  async (req, res) => {
    try {
      const email = normalizeEmail(req.body?.email);
      const otp = normalizeOtp(req.body?.otp);
      if (!email || !otp) {
        return res
          .status(400)
          .json({ message: "Email and verification code are required." });
      }

      const { sessionToken } = await verifyOtp({
        email,
        purpose: "password-reset",
        otp,
      });
      return res
        .status(200)
        .json({ message: "Code verified.", resetToken: sessionToken });
    } catch (err) {
      if (isOtpError(err)) return sendOtpFailure(res, err);
      console.error(
        "Password reset OTP verification error:",
        err.name || "UnknownError",
      );
      return res.status(500).json({ message: "Failed to verify code." });
    }
  },
);

router.post("/forgot-password/reset", otpVerifyLimiter, async (req, res) => {
  try {
    const resetToken = String(req.body?.resetToken || "");
    const password = String(req.body?.password || "");
    if (!resetToken || password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        message: `A verified reset session and password of at least ${MIN_PASSWORD_LENGTH} characters are required.`,
      });
    }

    const session = await consumeSession({
      purpose: "password-reset",
      sessionToken: resetToken,
    });
    if (!session) {
      return res
        .status(400)
        .json({ message: "Your reset session expired. Request a new code." });
    }

    const user = await User.findOne({ email: session.email });
    if (!user) {
      return res
        .status(400)
        .json({ message: "Unable to reset this account. Request a new code." });
    }

    user.password = await bcrypt.hash(password, 10);
    await user.save();
    console.info(`Password reset completed for ${maskEmail(user.email)}`);
    return res.status(200).json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("Password reset error:", err.name || "UnknownError");
    return res
      .status(500)
      .json({ message: "Unable to update your password right now." });
  }
});

router.post("/send-signup-otp", otpSendLimiter, async (req, res) => {
  try {
    const { name, password } = req.body || {};
    const email = normalizeEmail(req.body?.email);

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required." });
    }
    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }
    if (String(password).length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
    }

    if (await User.findOne({ email })) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const result = await issueAndSendOtp({
      email,
      purpose: "signup",
      name: String(name).trim().slice(0, 100),
      passwordHash: await bcrypt.hash(String(password), 10),
    });

    return res.status(200).json({
      message: "OTP email sent successfully.",
      expiresInSeconds: result.expiresInSeconds,
      resendAfterSeconds: result.resendAfterSeconds,
      otp: result.otp,
    });
  } catch (err) {
    return sendOtpFailure(res, err);
  }
});

router.post("/verify-signup-otp", otpVerifyLimiter, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = normalizeOtp(req.body?.otp);

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required." });
    }

    const { sessionToken } = await verifyOtp({ email, purpose: "signup", otp });
    return res
      .status(200)
      .json({
        message: "OTP verified successfully.",
        signupToken: sessionToken,
      });
  } catch (err) {
    if (isOtpError(err)) return sendOtpFailure(res, err);
    console.error("Verify signup OTP error:", err.name || "UnknownError");
    return res.status(500).json({ message: "Failed to verify OTP" });
  }
});

// Completes signup. Requires the one-time signupToken issued by /verify-signup-otp,
// so an account can never be created for an email that was not verified.
router.post("/signup", otpVerifyLimiter, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const signupToken = req.body?.signupToken;
    if (!email || !signupToken) {
      return res
        .status(400)
        .json({ message: "Email and a verified signup session are required." });
    }

    const session = await consumeSession({
      purpose: "signup",
      sessionToken: signupToken,
      email,
    });
    if (!session || !session.passwordHash) {
      return res
        .status(400)
        .json({ message: "Your signup session expired. Request a new OTP." });
    }

    if (await User.findOne({ email })) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const user = new User({
      name: session.name,
      email,
      password: session.passwordHash,
    });
    await user.save();
    console.info(`Signup completed for ${maskEmail(email)}`);
    res.json({
      token: signUserToken(user),
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ message: "Email already registered" });
    console.error("Signup error:", err.name || "UnknownError");
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/user-login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: "user" },
      process.env.JWT_SECRET || "change_this_secret",
      { expiresIn: "7d" },
    );
    return res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        imageUri:
          user.imageUri ||
          "https://www.iconpacks.net/icons/2/free-user-icon-3296-thumb.png",
      },
    });
  } catch (err) {
    console.error("User login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/google", async (req, res) => {
  const audience =
    process.env.GOOGLE_WEB_CLIENT_ID ||
    "929703402001-ntnpeoe05rnmdmie89qtq1dojq3sdlsc.apps.googleusercontent.com";
  const idToken = req.body?.idToken;

  if (!audience) {
    return res.status(503).json({
      message: "Google sign-in is not configured on the backend.",
    });
  }
  if (
    typeof idToken !== "string" ||
    idToken.length === 0 ||
    idToken.length > 10000
  ) {
    return res
      .status(400)
      .json({ message: "A valid Google ID token is required." });
  }

  let payload;
  try {
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken,
      audience,
    });
    payload = ticket.getPayload();
  } catch (error) {
    const code = error.code || error.name || "UnknownError";
    console.error("Google ID token verification failed:", code);
    const unavailableCodes = new Set([
      "ECONNRESET",
      "ETIMEDOUT",
      "ENOTFOUND",
      "EAI_AGAIN",
    ]);
    return res.status(unavailableCodes.has(code) ? 503 : 401).json({
      message: unavailableCodes.has(code)
        ? "Google sign-in verification is temporarily unavailable."
        : "Google sign-in token is invalid or expired.",
    });
  }

  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    return res.status(401).json({
      message: "Google must verify your email before you can sign in.",
    });
  }

  try {
    const normalizedEmail = normalizeEmail(payload.email);
    let user = await User.findOne({ googleId: payload.sub });

    if (user && user.email !== normalizedEmail) {
      const emailOwner = await User.findOne({ email: normalizedEmail });
      if (emailOwner && String(emailOwner._id) !== String(user._id)) {
        return res.status(409).json({
          message:
            "This Google account email is already associated with another account.",
        });
      }
      user.email = normalizedEmail;
    }

    if (!user) {
      user = await User.findOne({ email: normalizedEmail });
      if (user?.googleId && user.googleId !== payload.sub) {
        return res.status(409).json({
          message:
            "This email is already linked to a different Google account.",
        });
      }
    }

    if (!user) {
      user = new User({
        name: String(
          payload.name || payload.given_name || normalizedEmail.split("@")[0],
        ).trim(),
        email: normalizedEmail,
        googleId: payload.sub,
        imageUri: payload.picture,
      });
    } else {
      user.googleId = payload.sub;
      if (!user.name && payload.name) user.name = payload.name;
      if (!user.imageUri && payload.picture) user.imageUri = payload.picture;
    }

    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, role: "user" },
      process.env.JWT_SECRET || "change_this_secret",
      { expiresIn: "7d" },
    );

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        imageUri:
          user.imageUri ||
          "https://www.iconpacks.net/icons/2/free-user-icon-3296-thumb.png",
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "An account already exists for this Google identity. Please try again.",
      });
    }

    console.error("Google user sign-in failed:", error.name || "UnknownError");
    return res
      .status(500)
      .json({ message: "Unable to sign in with Google right now." });
  }
});

router.post("/firebase", async (req, res) => {
  const idToken = req.body?.idToken;
  if (
    typeof idToken !== "string" ||
    idToken.length === 0 ||
    idToken.length > 10000
  ) {
    return res
      .status(400)
      .json({ message: "A valid Firebase ID token is required." });
  }

  let decodedToken;
  try {
    const app = firebaseAdmin.getFirebaseAdminApp();
    decodedToken = await firebaseAuth.getAuth(app).verifyIdToken(idToken, true);
  } catch (error) {
    const code = error.code || error.name || "UnknownError";
    console.error("Firebase ID token verification failed:", code);
    const configurationErrors = new Set([
      "FIREBASE_ADMIN_NOT_CONFIGURED",
      "FIREBASE_ADMIN_INVALID_CONFIGURATION",
      "app/invalid-credential",
      "app/invalid-credential-value",
    ]);
    return res.status(configurationErrors.has(code) ? 503 : 401).json({
      message: configurationErrors.has(code)
        ? "Firebase sign-in is not configured on the backend."
        : "Firebase sign-in token is invalid or expired.",
    });
  }

  if (
    !decodedToken?.uid ||
    !decodedToken.email ||
    decodedToken.email_verified !== true
  ) {
    return res.status(401).json({
      message: "Verify your email address before signing in to Mawaddat.",
    });
  }

  try {
    const firebaseUid = String(decodedToken.uid);
    const normalizedEmail = normalizeEmail(decodedToken.email);
    const profileName =
      String(decodedToken.name || req.body?.name || "")
        .trim()
        .slice(0, 100) || normalizedEmail.split("@")[0];
    const profileImage =
      decodedToken.picture ||
      (typeof req.body?.imageUri === "string" &&
      /^https:\/\//i.test(req.body.imageUri)
        ? req.body.imageUri
        : undefined);
    let user = await User.findOne({ firebaseUid });

    if (user && user.email !== normalizedEmail) {
      const emailOwner = await User.findOne({ email: normalizedEmail });
      if (emailOwner && String(emailOwner._id) !== String(user._id)) {
        return res.status(409).json({
          message:
            "This email is already associated with another Mawaddat account.",
        });
      }
      user.email = normalizedEmail;
    }

    if (!user) {
      user = await User.findOne({ email: normalizedEmail });
      if (user?.firebaseUid && user.firebaseUid !== firebaseUid) {
        return res.status(409).json({
          message:
            "This email is already associated with another Firebase account.",
        });
      }
    }

    if (!user) {
      user = new User({
        name: profileName,
        email: normalizedEmail,
        firebaseUid,
        imageUri: profileImage,
      });
    } else {
      user.firebaseUid = firebaseUid;
      if (!user.name) user.name = profileName;
      if (!user.imageUri && profileImage) user.imageUri = profileImage;
    }

    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, role: "user" },
      process.env.JWT_SECRET || "change_this_secret",
      { expiresIn: "7d" },
    );

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        imageUri:
          user.imageUri ||
          "https://www.iconpacks.net/icons/2/free-user-icon-3296-thumb.png",
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "This Firebase account is already linked to a Mawaddat user.",
      });
    }

    console.error(
      "Firebase user sign-in failed:",
      error.name || "UnknownError",
    );
    return res
      .status(500)
      .json({ message: "Unable to sign in with Firebase right now." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;
    if (!email || typeof password !== "string" || password.length === 0) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const admin = await Admin.findOne({ email });
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: "admin" },
      process.env.JWT_SECRET || "change_this_secret",
      { expiresIn: "7d" },
    );
    return res.json({
      token,
      admin: { email: admin.email, name: admin.name },
    });
  } catch (error) {
    console.error("Admin login failed:", error.name || "UnknownError");
    return res.status(500).json({ message: "Unable to sign in right now." });
  }
});

module.exports = router;
