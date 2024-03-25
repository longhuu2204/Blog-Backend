const express = require("express");
const router = express.Router();

const Auth = require("../auth");
const Post = require("../modules/PostModule");
const Account = require("../modules/AccountModule");
const Comment = require("../modules/CommentModule");
const message = require("../common/Message");

/**
 * Bình luận trên 1 bài đăng
 * @params      id_post
 * @body        content
 * @permisson   Những người có tài khoản
 *              Không dùng cho tài khoản bị khóa
 * @return      200: COMMENT_SUCCESSFULL
 *              400: ERROR_DATA
 *              403: ERROR_ACCOUNT_BANNED
 *              404: POST_NOT_EXISTED
 */
router.post("/:id_post/comment", Auth.authenGTUser, async (req, res, next) => {
  try {
    let content = req.body.content;
    content = content.trim();
    let id_post = req.params.id_post;
    let acc = await Account.selectId(Auth.tokenData(req).id_account);

    // Tài khoản bị khóa
    if (acc.account_status != 0) {
      return res.status(403).json({
        message: message.account.ERROR_ACCOUNT_BANNED,
      });
    }

    let existPost = await Post.has(id_post);
    if (!existPost) {
      return res.status(404).json({
        message: message.post.POST_NOT_EXISTED,
      });
    }

    if (content != "") {
      let create = await Comment.addComment(acc.id_account, id_post, content);
      let change = await Comment.changeParent(create);
      change = await Comment.selectId(change.id_cmt);
      return res.status(200).json({
        message: message.comment.COMMENT_SUCCESSFULL,
        data: change,
      });
    } else {
      return res.status(400).json({
        message: message.comment.ERROR_DATA,
      });
    }
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/**
 * Xem tất cả bình luận (hiện)
 *
 * @permisson   Ai cũng có thể thực thi
 * @return      200: GET_SUCCESSFULL
 *              404: POST_NOT_EXISTED
 */
router.get("/:id_post/comment", async (req, res, next) => {
  try {
    let idPost = req.params.id_post;
    let existPost = await Post.has(idPost);

    if (!existPost) {
      return res.status(404).json({
        message: message.post.POST_NOT_EXISTED,
      });
    }

    let list = await Comment.listCommentInPost(idPost);
    res.status(200).json({
      message: message.common.GET_SUCCESSFULL,
      data: list,
    });
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/**
 * Xem tất cả bình luận chính (hiện)
 *
 * @permisson   Ai cũng có thể thực thi
 * @return      200: GET_SUCCESSFULL
 *              404: POST_NOT_EXISTED
 */
router.get("/:id_post/comment/main", async (req, res, next) => {
  try {
    let idPost = req.params.id_post;
    let existPost = await Post.has(idPost);

    if (!existPost) {
      return res.status(404).json({
        message: message.post.POST_NOT_EXISTED,
      });
    }

    let list = await Comment.listMainCommentInPost(idPost);
    res.status(200).json({
      message: message.common.GET_SUCCESSFULL,
      data: list,
    });
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/**
 * Xem tất cả bình luận phản hồi của 1 bình luận chính (hiện)
 *
 * @permisson   Ai cũng có thể thực thi
 * @return      200: GET_SUCCESSFULL
 *              404: COMMENT_MAIN_NOT_EXISTED
 */
router.get("/:id_post/comment/reply/:id_cmt_parent", async (req, res, next) => {
  try {
    let idParent = id_cmt_parent;
    let existParent = await Image.has(idParent);

    if (!existParent) {
      return res.status(404).json({
        message: message.comment.COMMENT_MAIN_NOT_EXISTED,
      });
    }

    let list = await Comment.listReplyInComment(idParent);
    res.status(200).json({
      message: message.common.GET_SUCCESSFULL,
      data: list,
    });
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/**
 * Xem tất cả bình luận kể cả ẩn
 *
 * @permisson   Người đăng bài
 *              Người có tài khoản Moder trở lên
 * @return      200: GET_SUCCESSFULL
 *              401: ERROR_ACCOUNT_UNAUTHORIZATION
 *              404: POST_NOT_EXISTED
 */
router.get(
  "/:id_post/comment/all",
  Auth.authenGTUser,
  async (req, res, next) => {
    try {
      let idPost = req.params.id_post;
      let existPost = await Post.has(idPost);
      let poster = await Post.selectAccountPostId(idPost);
      let acc = await Account.selectId(Auth.tokenData(req).id_account);

      if (!existPost) {
        return res.status(404).json({
          message: message.post.POST_NOT_EXISTED,
        });
      }

      if (acc.id_account !== poster.id_account) {
        if (acc.id_role < 1 || acc.id_role > 2)
          return res.status(401).json({
            message: message.account.ERROR_ACCOUNT_UNAUTHORIZATION,
          });
      }

      let list = await Comment.listCommentInPost(idPost);
      return res.status(200).json({
        message: message.common.GET_SUCCESSFULL,
        data: list,
      });
    } catch (error) {
      console.log(error);
      res.sendStatus(500);
    }
  }
);

/**
 * Trả lời của 1 comment chính
 * @body        content
 * @permisson   Người có tài khoản
 *              Người không bị khóa mõm
 * @return      200: COMMENT_SUCCESSFULL
 *              400: ERROR_DATA
 *              401: NOT_MATCH
 *              403: ERROR_ACCOUNT_BANNED
 *              404: COMMENT_MAIN_NOT_EXISTED
 *
 */
router.post(
  "/:id_post/comment/:id_cmt_parent/reply",
  Auth.authenGTUser,
  async (req, res, next) => {
    try {
      let idPost = req.params.id_post;
      let idParent = req.params.id_cmt_parent;
      let content = req.body.content;
      content = content.trim();
      let acc = await Account.selectId(Auth.tokenData(req).id_account);

      // Tài khoản bị khóa
      if (acc.account_status != 0) {
        return res.status(403).json({
          message: message.account.ERROR_ACCOUNT_BANNED,
        });
      }

      let existCmt = await Comment.has(idParent);
      let idPostOfCmt = await Comment.selectPostComment(idParent);

      if (!existCmt) {
        return res.status(404).json({
          message: message.comment.COMMENT_MAIN_NOT_EXISTED,
        });
      }

      if (idPostOfCmt.id_post != idPost) {
        return res.status(401).json({
          message: message.comment.NOT_MATCH,
        });
      }

      if (content) {
        let create = await Comment.addCommentWithParent(
          acc.id_account,
          idPost,
          idParent,
          content
        );
        let data = await Comment.selectId(create.id_cmt);
        res.status(200).json({
          message: message.comment.COMMENT_SUCCESSFULL,
          data: data,
        });
      } else {
        req.status(400).json({
          message: message.comment.ERROR_DATA,
        });
      }
    } catch (error) {
      console.log(error);
      res.sendStatus(500);
    }
  }
);

/**
 * Thay đổi bình luận
 * @body        content
 * @permisson   Người đăng bình luận
 * @return      200: UPDATE_SUCCESSFULL
 *              400: ERROR_DATA
 *              401: NOT_COMMENT_REAL
 *              403: ERROR_ACCOUNT_BANNED
 *              404: POST_NOT_EXISTED/POST_NOT_EXISTED
 */
router.put(
  "/:id_post/comment/:id_cmt/update",
  Auth.authenGTUser,
  async (req, res, next) => {
    try {
      let acc = await Account.selectId(Auth.tokenData(req).id_account);
      let idPost = req.params.id_post;
      let idCmt = req.params.id_cmt;
      let content = req.body.content;
      content = content.trim();

      if (acc.account_status != 0) {
        return res.status(403).json({
          message: message.account.ERROR_ACCOUNT_BANNED,
        });
      }

      let existCmt = await Comment.has(idCmt);
      let existPost = await Post.has(idPost);
      let id_commenter = await Comment.selectAccountComment(idCmt);
      if (!existPost) {
        return res.status(404).json({
          message: message.post.POST_NOT_EXISTED,
        });
      }

      if (!existCmt) {
        return res.status(404).json({
          message: message.comment.COMMENT_MAIN_NOT_EXISTED,
        });
      }

      if (acc.id_account === id_commenter.id_account) {
        if (content) {
          let update = await Comment.updateComment(idCmt, content);
          update = await Comment.selectId(idCmt);
          return res.status(200).json({
            message: message.common.UPDATE_SUCCESSFULL,
            data: update,
          });
        } else {
          res.status(400).json({
            message: message.comment.ERROR_DATA,
          });
        }
      } else {
        return res.status(401).json({
          message: message.comment.NOT_COMMENT_REAL,
        });
      }
    } catch (error) {
      console.log(error);
      res.sendStatus(500);
    }
  }
);

/**
 * Xóa bình luận cũ
 *
 * @permisson   Người bình luận hoặc, admin
 *              Không áp dụng cho tài khoản bị khóa
 * @return      200: DELETE_COMMENT_SUCCESSFULL
 *              401: ERROR_ACCOUNT_UNAUTHORIZATION
 *              403: ERROR_ACCOUNT_BANNED
 *              404: COMMENT_MAIN_NOT_EXISTED
 */
router.delete(
  "/:id_post/comment/:id_cmt/delete",
  Auth.authenGTUser,
  async (req, res, next) => {
    try {
      let acc = await Account.selectId(Auth.tokenData(req).id_account);
      let idCmt = req.params.id_cmt;
      if (acc.account_status != 0) {
        return res.status(403).json({
          message: message.account.ERROR_ACCOUNT_BANNED,
        });
      }

      let existCmt = await Comment.has(idCmt);
      let commenter = await Comment.selectAccountComment(idCmt);

      if (!existCmt) {
        return res.status(404).json({
          message: message.comment.COMMENT_MAIN_NOT_EXISTED,
        });
      }

      if (acc.id_account === commenter.id_account || acc.id_role == 1) {
        Comment.delete(idCmt);
        Comment.deleteParent(idCmt);
        return res.status(200).json({
          message: message.comment.DELETE_COMMENT_SUCCESSFULL,
        });
      } else {
        return res.status(401).json({
          message: message.account.ERROR_ACCOUNT_UNAUTHORIZATION,
        });
      }
    } catch (error) {
      console.log(error);
      res.sendStatus(500);
    }
  }
);

/**
 * Ẩn hoặc hủy ẩn bình luận
 *      0: nhìn thấy bình luận
 *      1: Ẩn bình luận
 *
 * @permisson   Người chủ bài viết
 *              Người mor
 *              Tài khoản phải không bị khóa
 * @return      200: UPDATE_SUCCESSFULL
 *              400: STATUS_FAIL (0 or 1)
 *              401: ERROR_ACCOUNT_UNAUTHORIZATION
 *              404: COMMENT_NOT_EXISTED
 */
router.put(
  "/:id_post/comment/:id_cmt/status/:new_status",
  Auth.authenGTUser,
  async (req, res, next) => {
    try {
      let idCmt = req.params.id_cmt;
      let newStatus = req.params.new_status;
      let acc = await Account.selectId(Auth.tokenData(req).id_account);
      let isCommenter = await Comment.has(idCmt);
      let idPost = await Comment.selectPostComment(idCmt);
      idPost = idPost.id_post;
      let poster = await Post.selectAccountPostId(idPost);

      if (!isCommenter) {
        return res.status(404).json({
          message: message.comment.COMMENT_NOT_EXISTED,
        });
      }

      if (acc !== poster.id_account) {
        if (acc.id_role === 3) {
          return res.status(401).json({
            message: message.account.ERROR_ACCOUNT_UNAUTHORIZATION,
          });
        }
      }

      if (newStatus) {
        if (newStatus != 0 && newStatus != 1) {
          return res.status(400).json({
            message: message.comment.STATUS_FAIL,
          });
        } else {
          let change = await Comment.changeStatus(idCmt, newStatus);
          change = await Comment.selectId(idCmt);
          return res.status(200).json({
            message: message.common.UPDATE_SUCCESSFULL,
            data: change,
          });
        }
      }
    } catch (error) {
      console.log(error);
      res.sendStatus(500);
    }
  }
);

module.exports = router;
