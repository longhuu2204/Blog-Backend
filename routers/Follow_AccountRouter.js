const express = require("express");
const router = express.Router();

const Auth = require("../auth");
const Account = require("../modules/AccountModule");
const FollowAccount = require("../modules/Follow_AccountModule");
const message = require("../common/Message");

/**
 * Người dùng theo dõi 1 tài khoản khác
 *
 * @permission  Đăng nhập
 * @return      200: ACTION_SUCCESSFULL
 *              400: NOT_FOLLOW
 *              404: ERROR_ACCOUNT_NOT_FIND
 */
router.post("/:id_follower", Auth.authenGTUser, async (req, res, next) => {
  try {
    let id_follower = req.params.id_follower;
    let id_following = Auth.tokenData(req).id_account;

    if (id_follower === id_following) {
      return res.status(400).json({
        message: message.follow_account.NOT_FOLLOW,
      });
    }

    let accExists = await Account.has(id_follower);
    if (accExists) {
      let followed = await FollowAccount.has(id_follower, id_following);
      if (followed) {
        return res.status(400).json({
          message: message.follow_account.FOLLOWED,
        });
      }

      // following theo dõi follower
      await FollowAccount.add(id_follower, id_following);

      res.status(200).json({
        message: message.common.ACTION_SUCCESSFULL,
      });
    } else {
      res.status(404).json({
        message: message.account.ERROR_ACCOUNT_NOT_FIND,
      });
    }
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/**
 * Người dùng BỎ theo dõi 1 tài khoản khác
 *
 * @permission  Đăng nhập
 * @return      200: ACTION_SUCCESSFULL
 *              400: NOT_FOLLOWED
 *              404: ERROR_ACCOUNT_NOT_FIND
 */
router.delete("/:id_follower", Auth.authenGTUser, async (req, res, next) => {
  try {
    let id_follower = req.params.id_follower;
    let id_following = Auth.tokenData(req).id_account;

    let accExists = await Account.has(id_follower);
    if (accExists) {
      let followed = await FollowAccount.has(id_follower, id_following);
      if (!followed) {
        return res.status(400).json({
          message: message.follow_account.NOT_FOLLOWED,
        });
      }

      await FollowAccount.delete(id_follower, id_following);
      res.status(200).json({
        message: message.common.ACTION_SUCCESSFULL,
      });
    } else {
      res.status(404).json({
        message: message.account.ERROR_ACCOUNT_NOT_FIND,
      });
    }
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/**
 * Người dùng bỏ theo dõi tất cả tài khoản
 *
 * @permission  Đăng nhập
 * @return      200: ACTION_SUCCESSFULL
 */
router.delete("/", Auth.authenGTUser, async (req, res, next) => {
  try {
    let id_account = Auth.tokenData(req).id_account;
    await FollowAccount.deleteAll(id_account);
    res.status(200).json({
      message: message.common.ACTION_SUCCESSFULL,
    });
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

module.exports = router;
