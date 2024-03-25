const express = require("express");
const router = express.Router();
const fs = require("fs");
const multer = require("multer");
const Auth = require("../auth");
const Information = require("../modules/InformationModule");
const Account = require("../modules/AccountModule");
const message = require("../common/Message");

const storage = multer.diskStorage({
  destination: "./uploads",
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

var upload = multer({
  storage: storage,
});

/**
 * Cập nhật logo
 * @body   image
 */
router.put(
  "/update/logo",
  Auth.authenAdmin,
  upload.single("image"),
  async (req, res, next) => {
    try {
      let file = req.file;

      if (!file) {
        return res.status(400).json({
          message: message.common.ACTION_FAILED,
        });
      } else {
        let old_image = await Information.selectLogo();
        fs.unlinkSync(old_image);
        let update = await Information.updateLogo(file.path);
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

/**
 * Cập nhật tag
 * @body   image
 */
router.put(
  "/update/tag",
  Auth.authenAdmin,
  upload.single("image"),
  async (req, res, next) => {
    try {
      let file = req.file;

      if (!file) {
        return res.status(400).json({
          message: message.common.ACTION_FAILED,
        });
      } else {
        let old_image = await Information.selectTag();
        fs.unlinkSync(old_image);
        let update = await Information.updateTag(file.path);
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

/**
 * Cập nhật avatar mặc định
 * @body   image
 */
router.put(
  "/update/avatar",
  Auth.authenAdmin,
  upload.single("image"),
  async (req, res, next) => {
    try {
      let file = req.file;

      if (!file) {
        return res.status(400).json({
          message: message.common.ACTION_FAILED,
        });
      } else {
        let old_image = await Information.selectAvatar();
        fs.unlinkSync(old_image);
        let update_information = await Information.updateAvatar(file.path);
        let update_account = await Account.updateAvatarDefault(
          old_image,
          file.path
        );
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

/**
 * Cập nhật name
 * @body   name
 */
router.put("/update/name", Auth.authenAdmin, async (req, res, next) => {
  try {
    let name = req.body.name;
    if (!name) {
      return res.status(400).json({
        message: message.common.ERROR_DATA,
      });
    }

    let update = await Information.updateName(name);

    return res.status(200).json({
      message: message.common.ACTION_SUCCESSFULL,
    });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * Cập nhật facebook
 * @body   facebook
 */
router.put("/update/facebook", Auth.authenAdmin, async (req, res, next) => {
  try {
    let facebook = req.body.facebook;
    if (!facebook) {
      return res.status(400).json({
        message: message.common.ERROR_DATA,
      });
    }

    let update = await Information.updateFacebook(facebook);

    return res.status(200).json({
      message: message.common.ACTION_SUCCESSFULL,
    });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * Cập nhật android
 * @body   name
 */
router.put("/update/android", Auth.authenAdmin, async (req, res, next) => {
  try {
    let android = req.body.android;
    if (!android) {
      return res.status(400).json({
        message: message.common.ERROR_DATA,
      });
    }

    let update = await Information.updateAndroid(android);

    return res.status(200).json({
      message: message.common.ACTION_SUCCESSFULL,
    });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * Cập nhật ios
 * @body   ios
 */
router.put("/update/ios", Auth.authenAdmin, async (req, res, next) => {
  try {
    let ios = req.body.ios;
    if (!ios) {
      return res.status(400).json({
        message: message.common.ERROR_DATA,
      });
    }

    let update = await Information.updateIos(ios);

    return res.status(200).json({
      message: message.common.ACTION_SUCCESSFULL,
    });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * Cập nhật thời hạn token
 * @body   token_days
 */
router.put("/update/token", Auth.authenAdmin, async (req, res, next) => {
  try {
    let token_days = req.body.token_days;
    if (!token_days) {
      return res.status(400).json({
        message: message.common.ERROR_DATA,
      });
    }

    let update = await Information.updateToken(token_days);

    return res.status(200).json({
      message: message.common.ACTION_SUCCESSFULL,
    });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * Cập nhật thời hạn mã xác nhận
 * @body   code_minutes
 */
router.put("/update/code", Auth.authenAdmin, async (req, res, next) => {
  try {
    let code_minutes = req.body.code_minutes;
    if (!code_minutes) {
      return res.status(400).json({
        message: message.common.ERROR_DATA,
      });
    }

    let update = await Information.updateCode(code_minutes);

    return res.status(200).json({
      message: message.common.ACTION_SUCCESSFULL,
    });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * Cập nhật 1 lượt
 * @body   logo, name, facebook, android, ios, token, code
 */
router.put("/update/all", Auth.authenAdmin, async (req, res, next) => {
  try {
    let code_minutes = req.body.code_minutes;
    let name = req.body.name;
    let facebook = req.body.facebook;
    let android = req.body.android;
    let ios = req.body.ios;
    let token_days = req.body.token_days;
    if (code_minutes && name && facebook && android && ios && token_days) {
      let update = await Information.updateAll(
        name,
        facebook,
        android,
        ios,
        token_days,
        code_minutes
      );
      return res.status(200).json({
        message: message.common.ACTION_SUCCESSFULL,
      });
    } else {
      return res.status(400).json({
        message: message.common.ERROR_DATA,
      });
    }
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * Lấy logo
 */
router.get("/logo", async (req, res, next) => {
  try {
    let path = await Information.selectLogo();
    let image = fs.readFile(path, (err, data) => {
      if (err) {
        return res.sendStatus(500);
      } else {
        res.status(200);
        return res.end(data);
      }
    });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * Lấy avatar mặc định
 */
router.get("/avatar", async (req, res, next) => {
  try {
    let path = await Information.selectAvatar();
    let image = fs.readFile(path, (err, data) => {
      if (err) {
        return res.sendStatus(500);
      } else {
        res.status(200);
        return res.end(data);
      }
    });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * Lấy logo tag mặc định
 */
router.get("/tag", async (req, res, next) => {
  try {
    let path = await Information.selectTag();
    let image = fs.readFile(path, (err, data) => {
      if (err) {
        return res.sendStatus(500);
      } else {
        res.status(200);
        return res.end(data);
      }
    });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * Lấy facebook
 */
router.get("/facebook", async (req, res, next) => {
  try {
    let data = await Information.selectFacebook();
    return res.status(200).json({
      message: message.common.ACTION_SUCCESSFULL,
      data: data,
    });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * Lấy android
 */
router.get("/android", async (req, res, next) => {
  try {
    let data = await Information.selectAndroid();
    return res.status(200).json({
      message: message.common.ACTION_SUCCESSFULL,
      data: data,
    });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * Lấy ios
 */
router.get("/ios", async (req, res, next) => {
  try {
    let data = await Information.selectIos();
    return res.status(200).json({
      message: message.common.ACTION_SUCCESSFULL,
      data: data,
    });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * Lấy tất cả
 */
router.get("/all", Auth.authenAdmin, async (req, res, next) => {
  try {
    let data = await Information.selectAll();
    return res.status(200).json({
      message: message.common.ACTION_SUCCESSFULL,
      data: data,
    });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

module.exports = router;
