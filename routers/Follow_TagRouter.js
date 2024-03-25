const express = require("express");
const router = express.Router();

const Auth = require("../auth");

const Tag = require("../modules/TagModule");
const FollowTag = require("../modules/Follow_TagModule");
const message = require("../common/Message");

/**
 * Người dùng theo dõi 1 tag
 *
 * @permission  Đăng nhập
 * @return      200: ACTION_SUCCESSFULL
 *              400: FOLLOWED
 *              404: TAG_NOT_EXISTED
 */
router.post("/:id_tag", Auth.authenGTUser, async (req, res, next) => {
  try {
    let id_tag = req.params.id_tag;
    let id_account = Auth.tokenData(req).id_account;

    let tagExists = await Tag.has(id_tag);
    if (tagExists) {
      let followed = await FollowTag.has(id_account, id_tag);
      if (followed) {
        res.status(400).json({
          message: message.follow_tag.FOLLOWED,
        });
      } else {
        await FollowTag.add(id_account, id_tag);
        res.status(200).json({
          message: message.common.ACTION_SUCCESSFULL,
        });
      }
    } else {
      res.status(404).json({
        message: message.tag.TAG_NOT_EXISTED,
      });
    }
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/**
 * Người dùng bỏ theo dõi 1 tag
 *
 * @permission  Đăng nhập
 * @return      200: ACTION_SUCCESSFULL
 *              400: NOT_FOLLOWED
 *              404: TAG_NOT_EXISTED
 */
router.delete("/:id_tag", Auth.authenGTUser, async (req, res, next) => {
  try {
    let id_tag = req.params.id_tag;
    let id_account = Auth.tokenData(req).id_account;

    let tagExists = await Tag.has(id_tag);
    if (tagExists) {
      let followed = await FollowTag.has(id_account, id_tag);

      if (followed) {
        await FollowTag.delete(id_account, id_tag);

        res.status(200).json({
          message: message.common.ACTION_SUCCESSFULL,
        });
      } else {
        res.status(400).json({
          message: message.follow_tag.NOT_FOLLOWED,
        });
      }
    } else {
      res.status(404).json({
        message: message.tag.TAG_NOT_EXISTED,
      });
    }
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/**
 * Người dùng bỏ theo dõi tất cả thẻ
 *
 * @permission  Đăng nhập
 * @return      200: ACTION_SUCCESSFULL
 */
router.delete("/", Auth.authenGTUser, async (req, res, next) => {
  try {
    let id_account = Auth.tokenData(req).id_account;
    await FollowTag.deleteAll(id_account);
    res.status(200).json({
      message: message.common.ACTION_SUCCESSFULL,
    });
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

module.exports = router;
