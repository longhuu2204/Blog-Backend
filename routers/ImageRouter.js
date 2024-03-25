const express = require("express");
const router = express.Router();
const fs = require("fs");
const multer = require("multer");
const Auth = require("../auth");
const Account = require("../modules/AccountModule");
const Image = require("../modules/ImageModule");
const message = require("../common/Message");

const storage = multer.diskStorage({
  destination: "./uploads",
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// const fileFilter = (req, file, cb) => {
//     // reject a file
//     if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
//         cb(null, true);
//     } else {
//         cb(null, false);
//     }
// };

var upload = multer({
  storage: storage,
});

/**
 * Lấy các id_image theo page của tài khoản đã đăng
 * @permisson   Những người có tài khoản
 *              Những tài khoản admin, mor được xem tất cả hình
 *              Không dùng cho tài khoản bị khóa
 * @return      200: ACTION_SUCCESSFULL
 *              401: Tài khoản không có quyền xem của người khác
 *              402: Sai đinh dạng page number
 *              403: Tài khoản đã bị khóa
 *              404: Tài khoản không tồn tại
 */
router.get("/account", Auth.authenGTUser, async (req, res, next) => {
  try {
    let id_account = Auth.tokenData(req).id_account;

    let data = await Image.listImageInAccount(id_account);
    let amount = await Image.amountImageInAccount(id_account);

    return res.status(200).json({
      message: message.common.ACTION_SUCCESSFULL,
      data: data,
      amount: amount,
    });
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/**
 * Lấy hình theo id
 * @permisson   Những người có tài khoản
 *
 * @return      200: Trả về hình
 *              400: Đọc file bị lỗi
 *              404: IMAGE_NOT_EXSITED
 */
router.get("/:id_image", async (req, res, next) => {
  try {
    let id_image = req.params.id_image;
    let has = await Image.has(id_image);

    if (!has) {
      return res.status(404).json({
        message: message.image.IMAGE_NOT_EXSITED,
      });
    } else {
      let path = await Image.selectUrl(id_image);
      let image = fs.readFile(path, (err, data) => {
        if (err) {
          res.status(400).json({
            message: message.image.NOT_READ_FILE,
          });
        } else {
          res.status(200);
          return res.end(data);
        }
      });
    }
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

/**
 * Xóa hình theo id_image
 * @permisson   Những người có tài khoản đăng hình đấy hoặc admin hoặc mor
 *              Không dùng cho tài khoản bị khóa
 * @return      200: ACTION_SUCCESSFULL
 *              401: ERROR_ACCOUNT_UNAUTHORIZATION
 *              403: ERROR_ACCOUNT_BANNED
 *              404: IMAGE_NOT_EXSITED
 */
router.delete("/:id_image", Auth.authenGTUser, async (req, res, next) => {
  try {
    let id_image = req.params.id_image;
    let has = await Image.has(id_image);

    if (!has) {
      return res.status(404).json({
        message: message.image.IMAGE_NOT_EXSITED,
      });
    }

    let acc = await Account.selectId(Auth.tokenData(req).id_account);
    let poster = await Image.selectAccount(id_image);
    let path = await Image.selectUrl(id_image);

    if (acc.account_status != 0) {
      return res.status(403).json({
        message: message.account.ERROR_ACCOUNT_BANNED,
      });
    }

    if (
      poster === acc.id_account ||
      acc.account_status == 1 ||
      acc.account_status == 2
    ) {
      fs.unlinkSync(path);
      let del = await Image.deleteImage(id_image);
      return res.status(200).json({
        message: message.common.ACTION_SUCCESSFULL,
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
});

/**
 * Xóa hình theo id_image
 * @permisson   Những người có tài khoản đăng hình đấy hoặc admin hoặc mor
 *              Không dùng cho tài khoản bị khóa
 * @return      200: ACTION_SUCCESSFULL
 *              401: ERROR_ACCOUNT_UNAUTHORIZATION
 *              403: ERROR_ACCOUNT_BANNED
 *              404: IMAGE_NOT_EXSITED
 */
router.delete("/:id_image/db", Auth.authenGTUser, async (req, res, next) => {
  try {
    let id_image = req.params.id_image;
    let has = await Image.has(id_image);

    if (!has) {
      return res.status(404).json({
        message: message.image.IMAGE_NOT_EXSITED,
      });
    }

    let acc = await Account.selectId(Auth.tokenData(req).id_account);
    let poster = await Image.selectAccount(id_image);
    // let path = await Image.selectUrl(id_image);

    if (acc.account_status != 0) {
      return res.status(403).json({
        message: message.account.ERROR_ACCOUNT_BANNED,
      });
    }

    if (poster === acc.id_account) {
      // fs.unlinkSync(path);
      let del = await Image.deleteImage(id_image);
      return res.status(200).json({
        message: message.common.ACTION_SUCCESSFULL,
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
});

/**
 * Đăng ảnh
 * @body        file hình
 * @permisson   Những người có tài khoản
 *              Không dùng cho tài khoản bị khóa
 * @return      200: ACTION_SUCCESSFULL
 *              400: NOT_RECEIVE_FILE
 *              403: ERROR_ACCOUNT_BANNED
 */
router.post(
  "/",
  Auth.authenGTUser,
  upload.single("image"),
  async (req, res, next) => {
    try {
      let file = req.file;
      let acc = await Account.selectId(Auth.tokenData(req).id_account);

      if (acc.account_status != 0) {
        fs.unlinkSync(file.path);
        return res.status(403).json({
          message: message.account.ERROR_ACCOUNT_BANNED,
        });
      }

      if (!file) {
        return res.status(400).json({
          message: message.image.NOT_RECEIVE_FILE,
        });
      } else {
        let save = await Image.addImage(acc.id_account, file.path);
        return res.status(200).json({
          message: message.common.ACTION_SUCCESSFULL,
          data: save,
        });
      }
    } catch (error) {
      console.log(error);
      res.sendStatus(500);
    }
  }
);

/**
 * Đổi ảnh
 * @body        file ảnh
 * @permisson   Những người đăng ảnh đó
 *              Không dùng cho tài khoản bị khóa
 * @return      200: ACTION_SUCCESSFULL
 *              400: ACTION_FAILED
 *              401: ERROR_ACCOUNT_UNAUTHORIZATION
 *              403: ERROR_ACCOUNT_BANNED
 *              404: IMAGE_NOT_EXSITED
 */
router.patch(
  "/change/:id_image",
  Auth.authenGTUser,
  upload.single("image"),
  async (req, res, next) => {
    try {
      let id_image = req.params.id_image;
      let acc = await Account.selectId(Auth.tokenData(req).id_account);
      let has = await Image.has(id_image);
      if (!has) {
        return res.status(404).json({
          message: message.image.IMAGE_NOT_EXSITED,
        });
      }

      let file = req.file;
      let image = await Image.selectImage(id_image);

      if (acc.account_status != 0) {
        return res.status(403).json({
          message: message.account.ERROR_ACCOUNT_BANNED,
        });
      }

      if (!file) {
        return res.status(400).json({
          message: message.common.ACTION_FAILED,
        });
      }

      if (image.id_account === acc.id_account) {
        try {
          fs.unlinkSync(image.url);
        } catch (er) {
          console.log("K co anh de unlink");
        }

        let change = await Image.changeImage(id_image, file.path);
        let img = await Image.selectID(id_image);
        return res.status(200).json({
          message: message.common.ACTION_SUCCESSFULL,
          data: img,
        });
      } else {
        return res.status(401).json({
          message: message.account.ERROR_ACCOUNT_UNAUTHORIZATION,
        });
      }
    } catch (err) {
      console.log(err);
      return res.sendStatus(500);
    }
  }
);

function isNumber(n) {
  return /^-?[\d.]+(?:e-?\d+)?$/.test(n);
}

module.exports = router;
