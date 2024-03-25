const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const Auth = require("../auth");
const Post = require("../modules/PostModule");
const Tag = require("../modules/TagModule");
const Account = require("../modules/AccountModule");
const Vote = require("../modules/VoteModule");
const Notification = require("../modules/NotificationModule");
const FollowAccount = require("../modules/Follow_AccountModule");
const Bookmark = require("../modules/BookmarkModule");
const message = require("../common/Message");

/**
 * Lấy tất cả các bài viết NHÁP của bản thân
 * @query       page
 * @permission  Đăng nhập
 * @return      200: GET_SUCCESSFULL
 */
router.get("/drafts", Auth.authenGTUser, async (req, res, next) => {
  try {
    let page = req.query.page;
    let accId = Auth.tokenData(req).id_account;

    let postsId;
    if (page) postsId = await Post.getDraftPosts(accId, page);
    else postsId = await Post.getDraftPosts(accId);

    let data = [];
    let acc = await Account.selectId(accId);

    for (let i = 0; i < postsId.length; i++) {
      let post = await Post.selectIdForUser(postsId[i].id_post, accId);
      let tags = await Post.selectTagsOfPost(postsId[i].id_post);
      data.push({
        post: post,
        author: acc,
        tags: tags,
      });
    }

    res.status(200).json({
      message: message.common.GET_SUCCESSFULL,
      data: data,
    });
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/**
 * Lấy tất cả các bài viết PUBLIC của bản thân
 * @query       page
 * @permission  Đăng nhập
 * @return      200: GET_SUCCESSFULL
 */
router.get("/public", Auth.authenGTUser, async (req, res, next) => {
  try {
    let page = req.query.page;

    let accId = Auth.tokenData(req).id_account;

    let postsId;
    if (page) postsId = await Post.getPublicPosts(accId, page);
    else postsId = await Post.getPublicPosts(accId);

    let data = [];
    let acc = await Account.selectId(accId);

    for (let i = 0; i < postsId.length; i++) {
      let post = await Post.selectIdForUser(postsId[i].id_post, accId);
      let tags = await Post.selectTagsOfPost(postsId[i].id_post);
      data.push({
        post: post,
        author: acc,
        tags: tags,
      });
    }

    res.status(200).json({
      message: message.common.GET_SUCCESSFULL,
      data: data,
    });
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/**
 * Lấy tất cả các bài viết UNLISTED của bản thân
 * @query       page
 * @permission  Đăng nhập mới được thực hiện
 * @return      200: GET_SUCCESSFULL
 */
router.get("/unlisted", Auth.authenGTUser, async (req, res, next) => {
  try {
    let page = req.query.page;

    let accId = Auth.tokenData(req).id_account;
    let postsId;
    if (page) postsId = await Post.getUnlistedPosts(accId, page);
    else postsId = await Post.getUnlistedPosts(accId);

    let data = [];
    let acc = await Account.selectId(accId);

    for (let i = 0; i < postsId.length; i++) {
      let post = await Post.selectIdForUser(postsId[i].id_post, accId);
      let tags = await Post.selectTagsOfPost(postsId[i].id_post);
      data.push({
        post: post,
        author: acc,
        tags: tags,
      });
    }

    res.status(200).json({
      message: message.common.GET_SUCCESSFULL,
      data: data,
    });
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/**
 * Lấy tất cả các bài viết bản thân đã bookmark
 * @query       page
 * @permission  Đăng nhập mới được thực hiện
 * @return      200: GET_SUCCESSFULL
 */
router.get("/bookmark", Auth.authenGTUser, async (req, res, next) => {
  try {
    let page = req.query.page;

    let accId = Auth.tokenData(req).id_account;
    let postsId;
    if (page) postsId = await Bookmark.list(accId, page);
    else postsId = await Bookmark.list(accId);

    let data = [];
    for (let i = 0; i < postsId.length; i++) {
      let post = await Post.selectIdForUser(postsId[i].id_post, accId);
      let acc = await Account.selectId(post.id_account);
      let tags = await Post.selectTagsOfPost(postsId[i].id_post);

      data.push({
        post: post,
        author: acc,
        tags: tags,
      });
    }

    res.status(200).json({
      message: message.common.GET_SUCCESSFULL,
      data: data,
    });
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/**
 * Lấy các bài viết công khai, chưa kiểm duyệt
 * @query       page
 * @permission  moder, admin
 * @return      200: GET_SUCCESSFULL
 */
router.get("/browse", Auth.authenGTModer, async (req, res, next) => {
  try {
    let page = req.query.page;

    let postsId;
    if (page) postsId = await Post.getPostsForBrowse(page);
    else postsId = await Post.getPostsForBrowse();

    let data = [];

    for (let i = 0; i < postsId.length; i++) {
      let id_post = postsId[i].id_post;

      let post = await Post.selectId(id_post);
      let acc = await Account.selectId(post.id_account);
      let tags = await Post.selectTagsOfPost(id_post);

      data.push({
        post: post,
        author: acc,
        tags: tags,
      });
    }

    res.status(200).json({
      message: message.common.GET_SUCCESSFULL,
      data: data,
    });
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/**
 * Lấy các bài viết spam
 * @query       page
 * @permission  moder,admin
 * @return      200: GET_SUCCESSFULL
 */
router.get("/spam", Auth.authenGTModer, async (req, res, next) => {
  try {
    let page = req.query.page;

    let postsId;
    if (page) postsId = await Post.getPostsSpam(page);
    else postsId = await Post.getPostsSpam();

    let data = [];

    for (let i = 0; i < postsId.length; i++) {
      let id_post = postsId[i].id_post;

      let post = await Post.selectId(id_post);
      let acc = await Account.selectId(post.id_account);
      let tags = await Post.selectTagsOfPost(id_post);

      data.push({
        post: post,
        author: acc,
        tags: tags,
      });
    }

    res.status(200).json({
      message: message.common.GET_SUCCESSFULL,
      data: data,
    });
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/**
 * Tìm kiếm bài viết theo từ khóa
 * @query       k, page
 * @permisson   Theo token
 * @return      200: GET_SUCCESSFULL
 *              400: NOT_KEYWORD_SEARCH
 */
router.get("/search", async (req, res, next) => {
  try {
    let { k } = req.query;
    if (!k || k.trim().length == 0) {
      return res.status(400).json({
        message: message.post.NOT_KEYWORD_SEARCH,
      });
    }

    k = k.toLowerCase();

    let idUser = false;
    const authorizationHeader = req.headers["authorization"];
    if (authorizationHeader) {
      const token = authorizationHeader.split(" ")[1];
      if (token) {
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, data) => {
          if (!err) {
            idUser = Auth.tokenData(req).id_account;
          }
        });
      }
    }

    let page = req.query.page;
    let postsId;

    if (page) postsId = await Post.getSearch(k, page);
    else postsId = await Post.getSearch(k);

    let data = [];

    for (let i = 0; i < postsId.length; i++) {
      let id_post = postsId[i].id_post;

      let post;
      if (idUser) post = await Post.selectIdForUser(id_post, idUser);
      else post = await Post.selectIdForUser(id_post);

      let acc = await Account.selectId(post.id_account);
      let tags = await Post.selectTagsOfPost(id_post);

      data.push({
        post: post,
        author: acc,
        tags: tags,
      });
    }

    res.status(200).json({
      message: message.common.GET_SUCCESSFULL,
      data: data,
    });
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/**
 * Lấy các bài viết public mới nhất
 * @query       page
 * @permisson   Theo token
 * @return      200: GET_SUCCESSFULL
 */
router.get("/newest", async (req, res, next) => {
  try {
    let idUser = false;
    const authorizationHeader = req.headers["authorization"];
    if (authorizationHeader) {
      const token = authorizationHeader.split(" ")[1];
      if (token) {
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, data) => {
          if (!err) {
            idUser = Auth.tokenData(req).id_account;
          }
        });
      }
    }

    let page = req.query.page;
    let postsId;

    if (page) postsId = await Post.getNewest(page);
    else postsId = await Post.getNewest();

    let data = [];

    for (let i = 0; i < postsId.length; i++) {
      let id_post = postsId[i].id_post;

      let post;
      if (idUser) post = await Post.selectIdForUser(id_post, idUser);
      else post = await Post.selectIdForUser(id_post);

      let acc = await Account.selectId(post.id_account);
      let tags = await Post.selectTagsOfPost(id_post);

      data.push({
        post: post,
        author: acc,
        tags: tags,
      });
    }

    res.status(200).json({
      message: message.common.GET_SUCCESSFULL,
      data: data,
    });
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/**
 * Lấy các bài viết theo thứ tự rating cao -> thấp
 * @query       page
 * @permisson   theo token
 * @return      200: GET_SUCCESSFULL
 */
router.get("/trending", async (req, res, next) => {
  try {
    let idUser = false;
    const authorizationHeader = req.headers["authorization"];
    if (authorizationHeader) {
      const token = authorizationHeader.split(" ")[1];
      if (token) {
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, data) => {
          if (!err) {
            idUser = Auth.tokenData(req).id_account;
          }
        });
      }
    }

    let page = req.query.page;
    let postsId;
    if (page) postsId = await Post.getTrending(page);
    else postsId = await Post.getTrending();

    let data = [];

    for (let i = 0; i < postsId.length; i++) {
      let id_post = postsId[i].id_post;

      let post;
      if (idUser) post = await Post.selectIdForUser(id_post, idUser);
      else post = await Post.selectIdForUser(id_post);

      let acc = await Account.selectId(post.id_account);
      let tags = await Post.selectTagsOfPost(id_post);

      data.push({
        post: post,
        author: acc,
        tags: tags,
      });
    }

    res.status(200).json({
      message: message.common.GET_SUCCESSFULL,
      data: data,
    });
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/**
 * Lấy các bài viết thuộc tag follow và tài khoản follow mới nhất
 * @query       page
 * @permisson   Đăng nhập mới được thực thi
 * @return      200: GET_SUCCESSFULL
 */
router.get("/following", Auth.authenGTUser, async (req, res, next) => {
  try {
    let id_account = Auth.tokenData(req).id_account;
    let postsId;
    let page = req.query.page;
    if (page) postsId = await Post.getFollowing(id_account, page);
    else postsId = await Post.getFollowing(id_account);

    let data = [];

    for (let i = 0; i < postsId.length; i++) {
      let id_post = postsId[i].id_post;

      let post = await Post.selectIdForUser(id_post, id_account);
      let acc = await Account.selectId(post.id_account);
      let tags = await Post.selectTagsOfPost(id_post);

      data.push({
        post: post,
        author: acc,
        tags: tags,
      });
    }

    res.status(200).json({
      message: message.common.GET_SUCCESSFULL,
      data: data,
    });
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/**
 * Lấy 1 bài viết theo id (đồng thời tính 1 lượt view)
 * @params      id bài viết
 * @permission  Theo token
 * @return      200: GET_SUCCESSFULL
 *              403: ERROR_ACCOUNT_UNAUTHORIZATION
 *              404: POST_NOT_EXISTED
 */
router.get("/:id", async (req, res, next) => {
  try {
    const authorizationHeader = req.headers["authorization"];

    let id = req.params.id;

    let postExists = await Post.has(id);
    if (postExists) {
      let post;
      if (authorizationHeader) {
        const token = authorizationHeader.split(" ")[1];
        if (!token) return res.sendStatus(401);

        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, data) => {
          if (err) {
            console.log(err);
            return res.sendStatus(403);
          }
        });

        let idUser = Auth.tokenData(req).id_account;
        post = await Post.selectIdForUser(id, idUser);
      } else {
        post = await Post.selectId(id);
      }

      let author = await Account.selectId(post.id_account);
      let tags = await Post.selectTagsOfPost(id);

      let visitor = Auth.tokenData(req);
      if (visitor == null) {
        console.log("guest");
        if (post.status === 1 && post.access !== 0) {
          // Những bài viết [đã kiểm duyệt] && [công khai || có link]
          let curView = (await Post.getView(id)).view;
          await Post.updateView(id, curView + 1);

          post.view++;

          res.status(200).json({
            message: message.common.GET_SUCCESSFULL,
            data: {
              post: post,
              author: author,
              tags: tags,
            },
          });
        } else {
          return res.status(403).json({
            message: message.account.ERROR_ACCOUNT_UNAUTHORIZATION,
          });
        }
      } else {
        let user = await Account.selectId(visitor.id_account);
        if (user.id_role <= 2 || user.id_account === post.id_account) {
          // Moder trở lên hoặc chính tác giả
          // Hoặc bài viết là công khai
          // Không tính view

          return res.status(200).json({
            message: message.common.GET_SUCCESSFULL,
            data: {
              post: post,
              author: author,
              tags: tags,
            },
          });
        } else if (post.status === 1 && post.access !== 0) {
          let curView = (await Post.getView(id)).view;
          await Post.updateView(id, curView + 1);

          post.view++;

          return res.status(200).json({
            message: message.common.GET_SUCCESSFULL,
            data: {
              post: post,
              author: author,
              tags: tags,
            },
          });
        } else {
          return res.status(403).json({
            message: message.account.ERROR_ACCOUNT_UNAUTHORIZATION,
          });
        }
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
 * Thêm bài viết mới
 * @body        title, content, tags, access
 * @permisson   Chỉ User trở lên mới được thi thi
 *              Tài khoản bị khóa không thể tạo bài viết
 * @return      201: ACTION_SUCCESSFULL
 *              400: ERROR_TAG_NUMBER/ERROR_DATA
 *              403: ERROR_ACCOUNT_BANNED
 *              404: TAG_INVALID
 */
router.post("/", Auth.authenGTUser, async (req, res, next) => {
  try {
    let { title, content, tags, access } = req.body;
    let acc = await Account.selectId(Auth.tokenData(req).id_account);

    // Tài khoản bị khóa
    if (acc.account_status != 0) {
      return res.status(403).json({
        message: message.account.ERROR_ACCOUNT_BANNED,
      });
    }

    if (!title || title.trim() === "") {
      return res.status(400).json({
        message: message.post.ERROR_TITLE,
      });
    }

    if (title.length > 100) {
      return res.status(400).json({
        message: message.post.TITLE_VALIDATION,
      });
    }

    if (!content || content.trim() === "") {
      return res.status(400).json({
        message: message.post.ERROR_CONTENT,
      });
    }

    if (title && content && tags) {
      // Loại bỏ các thẻ trùng lặp (nếu có)
      tags = [...new Set(tags)];

      if (tags.length < 1 || tags.length > 5) {
        return res.status(400).json({
          message: message.post.ERROR_TAG_NUMBER,
        });
      }

      // Kiểm tra tag có hợp lệ hay không
      for (let id_tag of tags) {
        let tagExists = await Tag.has(id_tag);
        if (!tagExists) {
          return res.status(404).json({
            message: message.tag.TAG_INVALID,
          });
        }
      }

      // Thêm bài viết
      let titleExists = await Post.hasTitle(title);
      if (titleExists) {
        return res.status(401).json({
          message: message.post.ERROR_TITLE_EXISTED,
        });
      }
      let postResult = await Post.addPost(acc.id_account, req.body);

      let idPostInsert = postResult.id_post;

      // Thêm các liên kết tag-post
      for (let id_tag of tags) {
        await Post.addPostTag(idPostInsert, id_tag);
      }

      res.status(201).json({
        message: message.common.ACTION_SUCCESSFULL,
        data: {
          post: postResult,
          tags: tags,
        },
      });
    } else {
      res.status(400).json({
        message: message.post.ERROR_CONTENT,
      });
    }
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/**
 * Chỉnh sửa bài viết theo id
 * @params      id bài viết
 * @body        title, content, access, tags
 * @permission  Chỉ người viết bài mới được sửa
 *              Tài khoản bị khóa không thẻ sửa bài
 * @return      200: UPDATE_SUCCESSFULL
 *              400: ERROR_TAG_NUMBER/ERROR_DATA
 *              403: ERROR_ACCOUNT_BANNED/NOT_UPDATE
 *              404: TAG_INVALID/POST_NOT_EXISTED
 */
router.put("/:id", Auth.authenGTUser, async (req, res, next) => {
  try {
    let id_post = req.params.id;

    let acc = await Account.selectId(Auth.tokenData(req).id_account);

    // Tài khoản bị khóa
    if (acc.account_status != 0) {
      return res.status(403).json({
        message: message.account.ERROR_ACCOUNT_BANNED,
      });
    }

    let postExists = await Post.has(id_post);
    if (postExists) {
      let post = await Post.selectId(id_post);
      // Người viết mới được sửa
      if (post.id_account === acc.id_account) {
        let { title, content, access, tags } = req.body;

        if ((title && content && access, tags)) {
          tags = [...new Set(tags)];

          if (tags.length < 1 || tags.length > 5) {
            return res.status(400).json({
              message: message.post.ERROR_TAG_NUMBER,
            });
          }

          // Kiểm tra tag có hợp lệ hay không
          for (let id_tag of tags) {
            let tagExists = await Tag.has(id_tag);
            if (!tagExists) {
              return res.status(404).json({
                message: message.tag.TAG_INVALID,
              });
            }
          }

          // Khi mọi thứ OK để có thể update

          // Xóa những post_tag cũ
          await Post.deletePostTag(id_post);

          // Thêm lại những tag mới
          for (let id_tag of tags) {
            await Post.addPostTag(id_post, id_tag);
          }

          // Cập nhật lại bài viết
          let result = await Post.update(id_post, req.body);

          res.status(200).json({
            message: message.common.UPDATE_SUCCESSFULL,
          });
        } else {
          res.status(400).json({
            message: message.common.ERROR_DATA,
          });
        }
      } else {
        res.status(403).json({
          message: message.post.NOT_UPDATE,
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
 * Xóa bài viết theo id
 * @params      id bài viết
 * @permission  Chỉ người viết mới được xóa bài
 *              Tài khoản bị khóa không thể xóa bài
 * @return      200: ACTION_SUCCESSFULL
 *              401: NOT_DELETE
 *              403: ERROR_ACCOUNT_BANNED
 *              404: POST_NOT_EXISTED
 */
router.delete("/:id", Auth.authenGTUser, async (req, res, next) => {
  try {
    let id = req.params.id;
    let acc = await Account.selectId(Auth.tokenData(req).id_account);

    // Tài khoản bị khóa
    if (acc.account_status != 0) {
      return res.status(403).json({
        message: message.account.ERROR_ACCOUNT_BANNED,
      });
    }

    let postExists = await Post.has(id);
    if (postExists) {
      // Chỉ người viết hoặc Admin mới được xóa bài
      let checkAuthor = await Post.checkPostAuthor(id, acc.id_account);
      if (checkAuthor || acc.id_role == 0) {
        await Post.deletePost(id);
        res.status(200).json({
          message: message.common.ACTION_SUCCESSFULL,
        });
      } else {
        res.status(401).json({
          message: message.post.NOT_DELETE,
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
 * Thay đổi trạng thái (status) của bài viết
 *      0: Chờ kiểm duyệt
 *      1: Đã kiểm duyệt
 *      2: Spam
 * @params      id, status_new
 * @permission  Chỉ Moder trở lên
 * @return      200: UPDATE_SUCCESSFULL
 *              400: STATUS_INVALID
 *              404: POST_NOT_EXISTED
 */
router.put(
  "/:id/status/:status_new",
  Auth.authenGTModer,
  async (req, res, next) => {
    try {
      let { id, status_new } = req.params;

      // Kiểm tra giá trị trạng thái
      if (status_new < 0 || status_new > 2) {
        return res.status(400).json({
          message: message.post.STATUS_INVALID,
        });
      }

      // Kiểm tra bài viết có tồn tại hay không
      let postExists = await Post.has(id);

      if (postExists) {
        let result = await Post.changeStatus(id, status_new);
        let isPublic = await Post.isPublic(id);
        y;
        if (status_new == 1 && isPublic) {
          let poster = await Post.selectId(id);
          let author = await Account.selectId(poster.id_account);
          let name = author.real_name;
          let id_followers = await FollowAccount.listFollowingOf(
            poster.id_account
          );
          for (let id_follower of id_followers) {
            Notification.addNotification(
              id_follower.id_following,
              `${name} đã đăng một bài viết mới: ${poster.title}`,
              `/post/${id}`
            );
          }
        }

        res.status(200).json({
          message: message.common.UPDATE_SUCCESSFULL,
        });
      } else {
        res.status(404).json({
          message: message.post.POST_NOT_EXISTED,
        });
      }
    } catch (error) {
      console.log(error);
      res.sendStatus(500);
    }
  }
);

/**
 * Thay đổi chế độ truy cập của bài viết (access)
 *      0: Nháp
 *      1: Công khai
 *      2: Chỉ có link mới xem được
 * @params      id, access_new
 * @permission  Người viết bài mới được thay đổi
 * @return      200: Thành công
 *              403: Không thể thay đổi bài viết của người khác
 *              404: Không tìm thấy bài viết để update
 */
router.put(
  "/:id/access/:access_new",
  Auth.authenGTUser,
  async (req, res, next) => {
    try {
      let { id, access_new } = req.params;

      // Kiểm tra bài viết có tồn tại hay không
      let postExists = await Post.has(id);

      if (postExists) {
        let accId = Auth.tokenData(req).id_account;
        let accPostId = await Post.selectAccountPostId(id);

        if (accId === accPostId.id_account) {
          // Kiểm tra giá trị access
          if (access_new < 0 || access_new > 2) {
            return res.status(400).json({
              message: "Trạng thái mới không hợp lệ",
            });
          }

          let result = await Post.changeAccess(id, access_new);

          res.status(200).json({
            message: "Cập nhật chế độ truy cập bài viết thành công",
          });
        } else {
          res.status(403).json({
            message: "Không thể thay đổi access bài viết của người khác",
          });
        }
      } else {
        res.status(404).json({
          message: "Không tìm thấy bài viết này",
        });
      }
    } catch (error) {
      console.log(error);
      res.sendStatus(500);
    }
  }
);

/**
 * Lấy số lượng và danh sách UP VOTE của bài viết
 * @params      id
 * @permisson   Ai cũng có thể thực thi
 * @return      200: Thành công, trả về số lượng và dữ liệu vote
 *              404: Bài viết không tồn tại
 */
router.get("/:id/voteup", async (req, res, next) => {
  try {
    let id = req.params.id;
    let postExists = await Post.has(id);
    if (postExists) {
      let result = await Vote.getUpVotes(id);
      res.status(200).json({
        message: "Lấy danh sách vote up thành công",
        data: {
          total: result.length,
          vote: result,
        },
      });
    } else {
      res.status(404).json({
        message: "Bài viết không tồn tại",
      });
    }
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/**
 * Lấy số lượng và danh sách DOWN VOTE của bài viết
 * @params      id
 * @permisson   Ai cũng có thể thực thi
 * @return      200: Thành công, trả về số lượng và dữ liệu vote
 *              404: Bài viết không tồn tại
 */
router.get("/:id/votedown", async (req, res, next) => {
  try {
    let id = req.params.id;
    let postExists = await Post.has(id);
    if (postExists) {
      let result = await Vote.getDownVotes(id);
      res.status(200).json({
        message: "Lấy danh sách vote down thành công",
        data: {
          total: result.length,
          vote: result,
        },
      });
    } else {
      res.status(404).json({
        message: "Bài viết không tồn tại",
      });
    }
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/**
 * Trả về điểm vote của bài viết: mark = up - down
 * @params      id
 * @permission  Ai cũng có thể thực thi
 * @return      200: Thành công, trả về điểm
 *              404: Bài viết không tồn tại
 */
router.get("/:id/vote", async (req, res, next) => {
  try {
    let id = req.params.id;
    let postExists = await Post.has(id);
    if (postExists) {
      let voteUp = await Vote.getUpVotes(id);
      let voteDown = await Vote.getDownVotes(id);
      res.status(200).json({
        message: "Lấy điểm vote thành công",
        data: voteUp.length - voteDown.length,
      });
    } else {
      res.status(404).json({
        message: "Bài viết không tồn tại",
      });
    }
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

module.exports = router;
