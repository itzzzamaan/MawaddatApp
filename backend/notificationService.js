const {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const Notification = require("./models/Notification");
const User = require("./models/User");

let firebaseApp;
let firebaseSetupWarningLogged = false;

const getFirebaseApp = () => {
  if (firebaseApp) return firebaseApp;

  const credentialJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialJson && !credentialPath) {
    if (!firebaseSetupWarningLogged) {
      console.warn(
        "Firebase push delivery is disabled: configure FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS.",
      );
      firebaseSetupWarningLogged = true;
    }
    return null;
  }

  const credential = credentialJson
    ? cert(JSON.parse(credentialJson))
    : applicationDefault();
  firebaseApp =
    getApps()[0] ||
    initializeApp({
      credential,
      ...(process.env.FIREBASE_PROJECT_ID
        ? { projectId: process.env.FIREBASE_PROJECT_ID }
        : {}),
    });

  return firebaseApp;
};

const sendPushNotifications = async (notifications, users) => {
  const app = getFirebaseApp();
  if (!app) return;

  const userById = new Map(users.map((user) => [String(user._id), user]));
  const entries = notifications.flatMap((notification) => {
    const user = userById.get(String(notification.userId));
    return (user?.pushTokens || []).map((token) => ({ token, notification }));
  });

  for (let offset = 0; offset < entries.length; offset += 500) {
    const batch = entries.slice(offset, offset + 500);

    const result = await getMessaging(app).sendEach(
      batch.map(({ token, notification }) => ({
        token,
        notification: {
          title: notification.title,
          body: notification.message,
        },
        android: {
          notification: { channelId: "default" },
        },
        data: {
          type: notification.type,
          targetId: notification.targetId,
          notificationId: String(notification._id),
        },
      })),
    );

    const invalidTokens = [];
    result.responses.forEach((response, index) => {
      if (response.success) return;
      const code = response.error?.code;
      if (
        code === "messaging/invalid-registration-token" ||
        code === "messaging/registration-token-not-registered"
      ) {
        invalidTokens.push(batch[index]);
        return;
      }

      console.error("Firebase push delivery failed:", {
        userId: String(batch[index].notification.userId),
        code,
        message: response.error?.message,
      });
    });

    await Promise.all(
      invalidTokens.map(({ token, notification }) =>
        User.updateOne(
          { _id: notification.userId },
          { $pull: { pushTokens: token } },
        ),
      ),
    );
  }
};

const createNotifications = async ({
  users,
  title,
  message,
  type,
  targetId,
}) => {
  if (users.length === 0) return [];

  const notifications = await Notification.insertMany(
    users.map((user) => ({
      userId: user._id,
      title,
      message,
      type,
      targetId: String(targetId),
    })),
  );

  try {
    await sendPushNotifications(notifications, users);
  } catch (error) {
    console.error("Firebase push delivery failed:", error);
  }

  return notifications;
};

const notifyAllUsersAboutEvent = async (event) => {
  const users = await User.find().select("_id pushTokens").lean();
  return createNotifications({
    users,
    title: "New event",
    message: `${event.title || "A new event"} has been posted.`,
    type: "event",
    targetId: event._id,
  });
};

const notifyPoetFollowersAboutPost = async (post) => {
  const poet = post.poet && typeof post.poet === "object" ? post.poet : null;
  const poetId = String(post.poetId || poet?._id || "").trim();
  const poetName = String(post.poetName || poet?.name || (typeof post.poet === "string" ? post.poet : "")).trim();
  const followerCriteria = [];

  if (poetId) followerCriteria.push({ "followedPoets.id": poetId });
  if (poetName) {
    const escapedName = poetName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    followerCriteria.push({
      "followedPoets.name": new RegExp(`^${escapedName}$`, "i"),
    });
  }
  if (followerCriteria.length === 0) return [];

  const users = await User.find({ $or: followerCriteria })
    .select("_id pushTokens")
    .lean();
  return createNotifications({
    users,
    title: "New post from a poet you follow",
    message: `${poetName || "A poet you follow"} shared a new post.`,
    type: "post",
    targetId: post._id,
  });
};

module.exports = {
  createNotifications,
  notifyAllUsersAboutEvent,
  notifyPoetFollowersAboutPost,
};
