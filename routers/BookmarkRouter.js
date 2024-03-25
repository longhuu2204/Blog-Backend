const express = require("express");
const router = express.Router();

const Auth = require("../auth");
const Post = require("../modules/PostModule");
const Bookmark = require("../modules/BookmarkModule");
const message = require("../common/Message");

/**
 * Bookmark bài viết
 * @params      id_post
 * @permission  Đăng nhập mới được bookmark
 * @return      200: BOOKMARK_SUCCESSFULL
 *              400: BOOKMARKED
 *              404: BOOKMARK_NOT_EXISTED
 */
router.post("/:id_post", Auth.authenGTUser, async (req, res, next) => {
  try {
    let id_post = req.params.id_post;
    let id_account = Auth.tokenData(req).id_account;

    let postExists = await Post.has(id_post);
    if (postExists) {
      let bookmarkExists = await Bookmark.has(id_account, id_post);
      if (bookmarkExists) {
        res.status(400).json({
          message: message.bookmark.BOOKMARKED,
        });
      } else {
        await Bookmark.add(id_account, id_post);
        res.status(200).json({
          message: message.bookmark.BOOKMARK_SUCCESSFULL,
        });
      }
    } else {
      res.status(404).json({
        message: message.bookmark.BOOKMARK_NOT_EXISTED,
      });
    }
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/**
 * Xóa bookmark
 * @params      id_post
 * @permission  Đăng nhập mới được xóa bookmark
 * @return      200: DELETE_BOOKMARK_SUCCESSFULL
 *              400: DELETE_BOOKMARK_FAIL
 *              404: BOOKMARK_NOT_EXISTED
 */
router.delete("/:id_post", Auth.authenGTUser, async (req, res, next) => {
  try {
    let id_post = req.params.id_post;
    let id_account = Auth.tokenData(req).id_account;

    let postExists = await Post.has(id_post);
    if (postExists) {
      let bookmarkExists = await Bookmark.has(id_account, id_post);
      if (bookmarkExists) {
        await Bookmark.delete(id_account, id_post);

        res.status(200).json({
          message: message.bookmark.DELETE_BOOKMARK_SUCCESSFULL,
        });
      } else {
        res.status(400).json({
          message: message.bookmark.DELETE_BOOKMARK_FAIL,
        });
      }
    } else {
      res.status(404).json({
        message: message.bookmark.BOOKMARK_NOT_EXISTED,
      });
    }
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

module.exports = router;
