const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Auth = require("../auth");
const MyDrive = require("../drive");
const Tag = require("../modules/TagModule");
const Post = require("../modules/PostModule");
const Account = require("../modules/AccountModule");
const message = require("../common/Message");

/**
 * Lấy tất cả thẻ
 * @permisson   Theo token
 * @return      200: GET_SUCCESSFULL
 */
router.get("/all", async (req, res, next) => {
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

    let result;
    if (idUser) result = await Tag.selectAllByAccount(idUser);
    else result = await Tag.selectAll();

    res.status(200).json({
      message: message.common.GET_SUCCESSFULL,
      data: result,
    });
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/**
 * Tìm kiếm thẻ theo từ khóa
 * @query       k
 * @permission  Theo token
 * @return      200: ACTION_SUCCESSFULL
 *              400: NOT_KEYWORD_SEARCH
 */
router.get("/search", async (req, res, next) => {
  try {
    let { k } = req.query;
    if (!k || k.trim().length == 0) {
      return res.status(400).json({
        message: message.tag.NOT_KEYWORD_SEARCH,
      });
    }

    k = k.toLowerCase();

    let page = req.query.page;

    const authorizationHeader = req.headers["authorization"];

    let list = [];
    let ids;
    if (page) ids = await Tag.getSearch(k, page);
    else ids = await Tag.getSearch(k);

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

      for (let tagId of ids) {
        let acc = await Tag.selectIdByAccount(tagId.id_tag, idUser);
        list.push(acc);
      }
    } else {
      for (let tagId of ids) {
        let acc = await Tag.selectId(tagId.id_tag);
        list.push(acc);
      }
    }
    return res.status(200).json({
      message: message.common.ACTION_SUCCESSFULL,
      data: list,
    });
    // }
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * Lấy 1 thẻ theo id
 *
 * @permission  Theo token
 * @return      200: GET_SUCCESSFULL
 *              404: NOT_FOUND
 */
router.get("/:id", async (req, res, next) => {
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

    let tagExists = await Tag.has(req.params.id);
    if (tagExists) {
      let result;
      if (idUser) result = await Tag.selectIdByAccount(req.params.id, idUser);
      else result = await Tag.selectId(req.params.id);

      res.status(200).json({
        message: message.common.GET_SUCCESSFULL,
        data: result,
      });
    } else {
      res.status(404).json({
        message: message.common.NOT_FOUND,
      });
    }
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/**
 * Thêm mới 1 thẻ
 * @body        name, logo
 * @permisson   Chỉ Moder trở lên mới được thêm thẻ mới
 * @return      201: ACTION_SUCCESSFULL
 *              400: NOT_LOGO/TAG_EXISTED/UPLOAD_FAIL/NOT_NAME_TAG
 */
router.post("/", Auth.authenGTModer, async (req, res, next) => {
  try {
    if (!req.files) {
      return res.status(400).json({
        message: message.tag.NOT_LOGO,
      });
    }

    let logo = req.files.logo;
    if (!logo) {
      return res.status(400).json({
        message: message.tag.NOT_LOGO,
      });
    }

    let { name } = req.body;

    if (name) {
      let tagNameExists = await Tag.hasName(name);
      if (tagNameExists) {
        return res.status(400).json({
          message: message.tag.TAG_EXISTED,
        });
      }

      let idLogo = await MyDrive.uploadImage(logo, name);
      if (!idLogo) {
        return res.status(400).json({
          message: message.tag.UPLOAD_FAIL,
        });
      } else {
        let logoPath = "https://drive.google.com/uc?export=view&id=" + idLogo;
        let result = await Tag.add(name, logoPath);

        res.status(201).json({
          message: message.common.ACTION_SUCCESSFULL,
          data: result,
        });
      }
    } else {
      res.status(400).json({
        message: message.tag.NOT_NAME_TAG,
      });
    }
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/**
 * Chỉnh sửa 1 thẻ theo id
 * @params      id
 * @body        name, logo
 * @permisson   Chỉ Moder trở lên mới được thực thi
 * @return      200: UPDATE_SUCCESSFULL
 *              400: TAG_EXISTED/TAG_VALIDATION
 *              404: TAG_NOT_EXISTED
 */
router.put("/:id", Auth.authenGTModer, async (req, res, next) => {
  try {
    let id = req.params.id;
    let tagExists = await Tag.has(id);

    if (tagExists) {
      let { name } = req.body;

      if (name) {
        let oldTag = await Tag.selectId(id);
        if (name != oldTag.name) {
          let tagNameExists = await Tag.hasName(name);
          if (tagNameExists) {
            return res.status(400).json({
              message: message.tag.TAG_EXISTED,
            });
          }
        }

        let logoPath = "";
        if (req.files && req.files.logo) {
          // Up logo mới
          let logoId = await MyDrive.uploadImage(req.files.logo, name);

          // Xóa logo cũ
          let oldLogoId = MyDrive.getImageId(oldTag.logo);
          await MyDrive.deleteFiles(oldLogoId);

          logoPath = "https://drive.google.com/uc?export=view&id=" + logoId;
        }

        let result = await Tag.update(id, name, logoPath);

        res.status(200).json({
          message: message.common.UPDATE_SUCCESSFULL,
          data: result,
        });
      } else {
        res.status(400).json({
          message: message.tag.TAG_VALIDATION,
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
 * Xóa thẻ theo id
 * @params      id
 * @permisson   Admin
 * @return      200: ACTION_SUCCESSFULL
 *              403: DELETE_FAIL
 *              404: TAG_NOT_EXISTED
 */
router.delete("/:id", Auth.authenAdmin, async (req, res, next) => {
  try {
    let id = req.params.id;
    let tagExists = await Tag.has(id);

    if (tagExists) {
      let countPostsOfTag = await Tag.countPostsOfTag(id);
      if (countPostsOfTag > 0) {
        return res.status(403).json({
          message: message.tag.DELETE_FAIL,
        });
      } else {
        let tag = await Tag.selectId(id);
        let tagLogoId = MyDrive.getImageId(tag.logo);
        await MyDrive.deleteFiles(tagLogoId);

        let deleteTag = await Tag.delete(id);
        return res.status(200).json({
          message: message.common.ACTION_SUCCESSFULL,
        });
      }
    } else {
      return res.status(404).json({
        message: message.tag.TAG_NOT_EXISTED,
      });
    }
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/**
 * Lấy danh sách bài viết thuộc thẻ có id theo trang
 * @params      id tag
 * @query       page
 * @permission  Ai cũng có thể thực thi
 * @return      200: GET_SUCCESSFULL
 *              404: TAG_NOT_EXISTED
 */
router.get("/:id/posts", async (req, res, next) => {
  try {
    let { id } = req.params;
    let page = req.query.page;

    let tagExists = await Tag.has(id);
    if (tagExists) {
      let postsId;

      if (page) postsId = await Post.getPostOfTag(id, page);
      else postsId = await Post.getPostOfTag(id);

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

module.exports = router;
