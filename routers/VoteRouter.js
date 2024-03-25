const express = require("express");
const router = express.Router();

const Auth = require("../auth");
const Post = require("../modules/PostModule");
const Vote = require("../modules/VoteModule");
const message = require("../common/Message");

/**
 * Thêm vote bài viết
 * @params      id_post, type
 * @permisson   Đăng nhập mới được vote
 * @return      201: ADD_VOTE_SUCCESSFULL
 *              200: CHANGE_VOTE_SUCCESSFULL
 *              400: VOTE_INVALID/ERROR_DATA
 *              404: POST_NOT_EXISTED
 */
router.post("/:id_post/:type", Auth.authenGTUser, async (req, res, next) => {
  try {
    let { id_post, type } = req.params;
    let id_account = Auth.tokenData(req).id_account;

    if (id_post != -1 && type != -1) {
      let postExists = await Post.has(id_post);

      if (!postExists) {
        return res.status(404).json({
          message: message.post.POST_NOT_EXISTED,
        });
      }
      if (type < 0 || type > 1) {
        return res.status(400).json({
          message: message.vote.VOTE_INVALID,
        });
      }

      let voteExists = await Vote.has(id_account, id_post);
      if (voteExists) {
        await Vote.update(id_account, id_post, type);
        return res.status(200).json({
          message: message.vote.CHANGE_VOTE_SUCCESSFULL,
        });
      }

      await Vote.add(id_account, { id_post, type });
      res.status(201).json({
        message: message.vote.ADD_VOTE_SUCCESSFULL,
      });
    } else {
      res.status(400).json({
        message: message.common.ERROR_DATA,
      });
    }
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/**
 * Lấy loại vote của bản thân theo bài viết
 *
 * @permisson   Đăng nhập mới được thực thi
 * @return      200: ACTION_SUCCESSFULL
 *              404: NOT_VOTED/POST_NOT_EXISTED
 */
router.get("/:id_post", Auth.authenGTUser, async (req, res, next) => {
  try {
    let id_account = Auth.tokenData(req).id_account;
    let id_post = req.params.id_post;

    let postExists = await Post.has(id_post);

    if (postExists) {
      let voteType = await Vote.getVoteType(id_account, id_post);

      if (voteType.status) {
        res.status(200).json({
          message: message.common.ACTION_SUCCESSFULL,
          data: voteType.vote,
        });
      } else {
        res.status(404).json({
          message: message.vote.NOT_VOTED,
        });
      }
    } else {
      res.status(404).json({
        message: message.post.POST_NOT_EXISTED,
      });
    }
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/**
 * Xóa vote
 *
 * @permission  Đăng nhập mới được thực thi
 * @return      200: ACTION_SUCCESSFULL
 *              404: NOT_VOTED/POST_NOT_EXISTED
 */
router.delete("/:id_post", Auth.authenGTUser, async (req, res, next) => {
  try {
    let id_account = Auth.tokenData(req).id_account;
    let id_post = req.params.id_post;

    let postExists = await Post.has(id_post);

    if (postExists) {
      let voteType = await Vote.getVoteType(id_account, id_post);

      if (voteType.status) {
        await Vote.delete(id_account, id_post);
        res.status(200).json({
          message: message.common.ACTION_SUCCESSFULL,
        });
      } else {
        res.status(404).json({
          message: message.vote.NOT_VOTED,
        });
      }
    } else {
      res.status(404).json({
        message: message.post.POST_NOT_EXISTED,
      });
    }
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/**
 * Thay đổi loại vote
 * @params       id_post, type
 * @permission  Đăng nhập mới được thực thi
 * @return      200: ACTION_SUCCESSFULL
 *              400: VOTE_INVALID
 *              404: NOT_VOTED/POST_NOT_EXISTED
 */
router.put("/:id_post/:type", Auth.authenGTUser, async (req, res, next) => {
  try {
    let id_account = Auth.tokenData(req).id_account;
    let { id_post, type } = req.params;

    if (type < 0 || type > 1) {
      return res.status(400).json({
        message: message.vote.VOTE_INVALID,
      });
    }

    let postExists = await Post.has(id_post);

    if (postExists) {
      let voteType = await Vote.getVoteType(id_account, id_post);

      if (voteType.status) {
        await Vote.update(id_account, id_post, type);
        res.status(200).json({
          message: message.common.ACTION_SUCCESSFULL,
        });
      } else {
        res.status(404).json({
          message: message.vote.NOT_VOTED,
        });
      }
    } else {
      res.status(404).json({
        message: message.post.POST_NOT_EXISTED,
      });
    }
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

module.exports = router;
