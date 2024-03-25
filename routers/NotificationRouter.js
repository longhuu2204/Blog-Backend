const express = require("express");
const router = express.Router();
const Auth = require("../auth");
const Account = require("../modules/AccountModule");
const Notification = require("../modules/NotificationModule");
const message = require("../common/Message");

/**
 * Xóa thông báo
 * @permisson   Người được nhận thông báo đó
 * @return      200: ACTION_SUCCESSFULL
 *              401: ERROR_ACCOUNT_UNAUTHORIZATION
 *              404: NOTIFICATION_NOT_EXISTED
 */
router.delete(
  "/:id_notification",
  Auth.authenGTUser,
  async (req, res, next) => {
    try {
      let id_notificatioin = req.params.id_notification;
      let exist = await Notification.has(id_notificatioin);

      if (!exist) {
        return res.status(404).json({
          message: message.notification.NOTIFICATION_NOT_EXISTED,
        });
      }

      let id_account = await Notification.selectAccount(id_notificatioin);

      if (id_account != Auth.tokenData(req).id_account) {
        return res.status(401).json({
          message: message.account.ERROR_ACCOUNT_UNAUTHORIZATION,
          id1: id_account,
          id2: Auth.tokenData(req).id_account,
        });
      } else {
        let deleted = await Notification.deleteNotification(id_notificatioin);
        return res.status(200).json({
          message: message.common.ACTION_SUCCESSFULL,
        });
      }
    } catch (err) {
      return res.sendStatus(500);
    }
  }
);

/**
 * Lấy số lượng thông báo chưa đọc
 * @permisson   Đăng nhập
 * @return      200: GET_SUCCESSFULL
 */
router.get("/count", Auth.authenGTUser, async (req, res, next) => {
  try {
    let id_account = Auth.tokenData(req).id_account;
    let count = await Notification.countUnreadNotification(id_account);
    return res.status(200).json({
      message: message.common.GET_SUCCESSFULL,
      data: count,
    });
  } catch (err) {
    return res.sendStatus(500);
  }
});

/**
 * Lấy thông báo CHƯA ĐỌC theo trang
 * @permisson   Tải khoản được tạo
 * @return      200: GET_SUCCESSFULL
 */
router.get("/all", Auth.authenGTUser, async (req, res, next) => {
  try {
    let id_account = Auth.tokenData(req).id_account;
    let data = await Notification.listNotification(id_account);
    return res.status(200).json({
      message: message.common.GET_SUCCESSFULL,
      data: data,
    });
  } catch (err) {
    return res.sendStatus(500);
  }
});

/**
 * Lấy tất cả thông báo (cả chưa đọc và đọc rồi)
 * @permisson   Tải khoản được tạo
 * @return      200: GET_SUCCESSFULL
 */
router.get("/list", Auth.authenGTUser, async (req, res, next) => {
  try {
    let id_account = Auth.tokenData(req).id_account;
    let data = await Notification.listAllNotification(id_account);
    return res.status(200).json({
      message: message.common.GET_SUCCESSFULL,
      data: data,
    });
  } catch (err) {
    return res.sendStatus(500);
  }
});

/**
 * Đánh dấu đã đọc tất cả thông báo của user
 * @permisson   Đăng nhập
 * @return      200: ACTION_SUCCESSFULL
 */
router.get("/read_all", Auth.authenGTUser, async (req, res, next) => {
  try {
    let id_account = Auth.tokenData(req).id_account;
    let data = await Notification.readAllNotification(id_account);
    return res.status(200).json({
      message: message.common.ACTION_SUCCESSFULL,
      data: data,
    });
  } catch (err) {
    return res.sendStatus(500);
  }
});

/**
 * Xóa tất cả thông báo của user
 * @permisson   Đăng nhập
 * @return      200: GET_SUCCESSFULL
 */
router.delete("/delete_all", Auth.authenGTUser, async (req, res, next) => {
  try {
    let id_account = Auth.tokenData(req).id_account;
    let data = await Notification.deleteAllNotification(id_account);
    return res.status(200).json({
      message: message.common.GET_SUCCESSFULL,
      data: data,
    });
  } catch (err) {
    return res.sendStatus(500);
  }
});

/**
 * Vô thông báo để xác nhận đã xem
 * @permisson   Tài khoản đã tạo
 * @return      200: ACTION_SUCCESSFULL
 *              404: NOTIFICATION_NOT_EXISTED
 */
router.get("/:id_notification", Auth.authenGTUser, async (req, res, next) => {
  try {
    let id_notificatioin = req.params.id_notification;
    let exist = await Notification.has(id_notificatioin);

    if (!exist) {
      return res.status(404).json({
        message: message.notification.NOTIFICATION_NOT_EXISTED,
      });
    } else {
      let data = await Notification.selectID(id_notificatioin);
      return res.status(200).json({
        message: message.common.ACTION_SUCCESSFULL,
        data: data,
      });
    }
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * Vô thông báo để xác nhận đã xem
 * @permisson   Tài khoản đã tạo
 * @return      200: ACTION_SUCCESSFULL
 *              403: ERROR_ACCOUNT_UNAUTHORIZATION
 *              404: NOTIFICATION_NOT_EXISTED
 */
router.get(
  "/:id_notification/read",
  Auth.authenGTUser,
  async (req, res, next) => {
    try {
      let id_notification = req.params.id_notification;
      let exist = await Notification.has(id_notification);
      let id_account = Auth.tokenData(req).id_account;

      if (!exist) {
        return res.status(404).json({
          message: message.notification.NOTIFICATION_NOT_EXISTED,
        });
      } else {
        let notification = await Notification.selectID(id_notification);
        if (notification.id_account !== id_account) {
          return res.status(403).json({
            message: message.account.ERROR_ACCOUNT_UNAUTHORIZATION,
          });
        }

        await Notification.readNotification(id_notification);
        return res.status(200).json({
          message: message.common.ACTION_SUCCESSFULL,
        });
      }
    } catch (err) {
      console.log(err);
      return res.sendStatus(500);
    }
  }
);

module.exports = router;
