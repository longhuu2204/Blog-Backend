const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const saltRounds = 10;

const router = express.Router();
const fs = require("fs");
const multer = require("multer");
const Account = require("../modules/AccountModule");
const Role = require("../modules/RoleModule");
const Post = require("../modules/PostModule");
const Bookmark = require("../modules/BookmarkModule");
const FollowTag = require("../modules/Follow_TagModule");
const FollowAccount = require("../modules/Follow_AccountModule");
const Vote = require("../modules/VoteModule");
const LockAccount = require("../modules/LockAccountModule");
const Notification = require("../modules/NotificationModule");
const Verification = require("../modules/VerificationModule");
const Mailer = require("../mail");
const Information = require("../modules/InformationModule");
const MyDrive = require("../drive");
const message = require("../common/Message");

const Auth = require("../auth");
const { selectIdStatus } = require("../modules/AccountModule");
const storage = multer.diskStorage({
  destination: "./uploads",
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
});

/**
 * Đăng nhập
 * @body   account_name, password
 * @return  200: LOGIN_SUCCESSFULL
 *          400: ERROR_ACCOUNT_LOGIN
 *          404: ERROR_ACCOUNT_VALIDATION
 */
router.post("/login", async (req, res, next) => {
  try {
    let username = req.body.account_name;
    let password = req.body.password;

    if (!(username && password)) {
      return res.status(404).json({
        message: message.account.ERROR_ACCOUNT_VALIDATION,
        use: username,
        pass: password,
      });
    }

    let exist = await Account.hasByUsername(username);

    if (exist) {
      let acc = await Account.selectByUsername(username);
      let match = await bcrypt.compare(password, acc.password);

      if (acc.account_status == 1) {
        let valid = await LockAccount.check(acc.id_account);
        if (valid) {
          Account.updateStatus(acc.id_account, 0);
        }
      }

      if (match) {
        var data = {
          id_account: acc.id_account,
          id_role: acc.id_role,
          account_name: acc.account_name,
          account_status: acc.account_status,
        };
        let days_token = await Information.selectToken();
        const accessToken = jwt.sign(data, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: `${days_token}d`,
        });

        return res.status(200).json({
          message: message.account.LOGIN_SUCCESSFULL,
          accessToken: accessToken,
          data: data,
        });
      } else {
        return res.status(400).json({
          message: message.account.ERROR_ACCOUNT_LOGIN,
        });
      }
    } else {
      return res.status(400).json({
        message: message.account.ERROR_ACCOUNT_LOGIN,
      });
    }
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * Khóa tài khoản tạm thời
 * @params      id: id người bị khóa
 * @body        reason, hours_lock
 * @permission  moder trở lên
 * @return      200: BAN_SUCCESSFULL
 *              202: ERROR_ACCOUNT_BANNED
 *              400: ERROR_BAN_VALIDATION
 *              401: ERROR_ACCOUNT_TIME_BAN
 *              403: ERROR_ACCOUNT_UNAUTHORIZATION
 *              404: ERROR_ACCOUNT_NOT_FIND
 */
router.post("/:id/ban", Auth.authenGTModer, async (req, res, next) => {
  try {
    let id_account_lock = req.params.id;
    let id_account_boss = Auth.tokenData(req).id_account;
    let reason = req.body.reason;
    let hours_lock = req.body.hours_lock;
    let exist = await Account.has(id_account_lock);
    if (!exist) {
      return res.status(404).json({
        message: message.account.ERROR_ACCOUNT_NOT_FIND,
      });
    }

    let acc_boss = await Account.selectId(id_account_boss);
    let acc_lock = await Account.selectId(id_account_lock);

    if (acc_boss.account_status != 0 || acc_boss.id_role >= acc_lock.id_role) {
      return res.status(403).json({
        message: message.account.ERROR_ACCOUNT_UNAUTHORIZATION,
      });
    }

    if (Number(hours_lock) < 1 || Number(hours_lock) > 576) {
      return res.status(401).json({
        message: message.account.ERROR_ACCOUNT_TIME_BAN,
      });
    }

    if (acc_lock.account_status != 0) {
      return res.status(202).json({
        message: message.account.ERROR_ACCOUNT_BANNED,
      });
    }

    if (reason && hours_lock && isNumber(hours_lock)) {
      let ban = LockAccount.add(
        id_account_lock,
        id_account_boss,
        reason,
        hours_lock
      );
      let notify = Notification.addNotification(
        id_account_lock,
        `Tài khoản của bạn đã bị khóa ${hours_lock} giờ`,
        `/account/${id_account_lock}`
      );
      let lock = Account.updateStatus(id_account_lock, 1);
      setTimeUnlock(id_account_lock, Number(hours_lock) * 3600000);
      res.status(200).json({
        message: message.account.BAN_SUCCESSFULL,
      });
    } else {
      return res.status(400).json({
        message: message.account.ERROR_BAN_VALIDATION,
      });
    }
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * Quên mật khẩu
 * @body        account_name
 * @permission   Ai cũng có thể thực thi
 * @return      200: Gửi mail thành công, trả về dữ liệu của tài khoản (để qua /:id/confirm)
 *              400: ERROR_DATA_VALIDATION
 *              404: ERROR_ACCOUNT_NOT_FIND_ID
 */
router.post("/forgot/password", async (req, res, next) => {
  try {
    let username = req.body.account_name;
    if (!username) {
      return res.status(400).json({
        message: message.account.ERROR_DATA_VALIDATION,
      });
    }

    let exist = await Account.hasByUsername(username);

    if (!exist) {
      return res.status(404).json({
        message: message.account.ERROR_ACCOUNT_NOT_FIND,
      });
    } else {
      let acc = await Account.selectByUsername(username);
      let code = await createCode();

      bcrypt.hash(code, saltRounds, async (err, hash) => {
        let send = Mailer.sendVerification(acc.email, code);
        code = hash;
        if (err) {
          console.log(err);
          return res.sendStatus(500);
        }
        let minutes = await Information.selectCode();
        let id_verify = await Verification.add(acc.id_account, code, minutes);
        let del = autoDeleteCode(id_verify);
      });

      res.status(200).json({
        message: message.account.SEND_CODE,
        id_account: acc.id_account,
      });
    }
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * WARNING
 * Xác nhận mã (mã có hiệu lực trong 60s)
 * @params      id tài khoản cần lấy lại
 * @body        code
 * @permission  Ai cũng có thể thực thi
 * @return      200: Đổi thành công, trả về jwt để thêm vào header (xog thì chuyển qua đổi mật khẩu)
 *              400: ERROR_CODE
 *              404: CODE_TIMED
 */
// TODO: Nên random mật khẩu mới cho user
router.post("/:id/confirm", async (req, res, next) => {
  try {
    let code = req.body.code;
    let id_account = req.params.id;

    let exist = await Verification.has(id_account);
    if (!exist) {
      return res.status(404).json({
        message: message.account.CODE_TIMED,
      });
    }

    let valid = await Verification.check(id_account);
    if (!valid) {
      let deleteCode = await Verification.deleteByAccount(id_account);
      return res.status(404).json({
        message: message.account.CODE_TIMED,
      });
    }

    let verify = await Verification.selectCode(id_account);
    let match = await bcrypt.compare(code, verify);
    if (match) {
      bcrypt.hash("123456", saltRounds, async (err, hash) => {
        let new_password = hash;
        let changePassword = await Account.updatePassword(
          id_account,
          new_password
        );
      });

      let acc = await Account.selectId(id_account);
      var data = {
        id_account: acc.id_account,
        id_role: acc.id_role,
        account_name: acc.account_name,
        account_status: acc.account_status,
      };
      let days_token = await Information.selectToken();
      const accessToken = jwt.sign(data, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: `${days_token}d`,
      });

      return res.status(200).json({
        message: "Đăng nhập thành công, mật khẩu reset 123456",
        accessToken: accessToken,
        data: data,
      });
    } else {
      return res.status(400).json({
        message: message.account.ERROR_CODE,
      });
    }
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * Đổi password của cá nhân
 * @body        old_password, new_password
 * @permission  Người đang đăng nhập
 * @return      200: CHANGE_PASSWORD_SUCCESSFULL
 *              400: NEW_PASSWORD_VALIDATION
 *              401: OLD_PASSWORD_VALIDATION
 *              403: OLD_PASSWORD_WRONG
 */
router.put("/change/password", Auth.authenGTUser, async (req, res, next) => {
  try {
    let new_password = req.body.new_password;
    let old_password = req.body.old_password;
    let id_account = Auth.tokenData(req).id_account;

    if (old_password !== "") {
      let acc = await Account.selectId(id_account);
      acc = await Account.selectByUsername(acc.account_name);
      let match = await bcrypt.compare(old_password, acc.password);

      if (match) {
        if (old_password === new_password) {
          return res.status(401).json({
            message: message.account.NOT_OVERLAP,
          });
        }

        if (new_password !== "") {
          if (new_password.length < 8) {
            return res.status(400).json({
              message: message.account.ERROR_PASSWORD_MIN,
            });
          }
          if (new_password.length > 32) {
            return res.status(400).json({
              message: message.account.ERROR_PASSWORD_MAX,
            });
          }
          const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\W)/;
          if (passwordRegex.test(new_password)) {
            bcrypt.hash(new_password, saltRounds, async (err, hash) => {
              new_password = hash;
              let changePassword = await Account.updatePassword(
                id_account,
                new_password
              );
              return res.status(200).json({
                message: message.common.UPDATE_SUCCESSFULL,
              });
            });
          } else {
            return res.status(400).json({
              message: message.account.ERROR_PASSWORD_FORMAT,
            });
          }
        } else {
          return res.status(400).json({
            message: message.account.NEW_PASSWORD_VALIDATION,
          });
        }
      } else {
        return res.status(403).json({
          message: message.account.OLD_PASSWORD_WRONG,
        });
      }
    } else {
      return res.status(401).json({
        message: message.account.OLD_PASSWORD_WRONG,
      });
    }
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * Thêm 1 tài khoản thường
 * @body        account_name, real_name, email, password
 * @permission  Ai cũng có thể thực thi
 * @return      200: REGISTER_SUCCESSFULL
 *              400: ERROR_ACCOUNT_EXISTED
 *              401: ERROR_EMAIL_EXISTED
 *              402: ERROR_REGISTER_VALIDATION/ERROR_ACCOUNT_NAME_VALIDATION/ERROR_EMAIL_VALIDATION
 *              403: ERROR_EMAIL_INVALID_FORMAT
 *              500: ERROR_OTHER
 */
router.post("/", async (req, res, next) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\W)/;
  try {
    var { account_name, real_name, email, password } = req.body;

    if (account_name && real_name && email && password) {
      if (account_name.length > 50) {
        return res.status(402).json({
          message: message.account.ERROR_ACCOUNT_NAME_VALIDATION,
        });
      }

      if (real_name.length > 50) {
        return res.status(402).json({
          message: message.account.ERROR_REAL_NAME_VALIDATION,
        });
      }

      if (email.length > 50) {
        return res.status(402).json({
          message: message.account.ERROR_EMAIL_VALIDATION,
        });
      }

      if (!emailRegex.test(email)) {
        return res.status(403).json({
          message: message.account.ERROR_EMAIL_INVALID_FORMAT,
        });
      }

      if (password.length < 8) {
        return res.status(402).json({
          message: message.account.ERROR_PASSWORD_MIN,
        });
      }

      if (password.length > 32) {
        return res.status(402).json({
          message: message.account.ERROR_PASSWORD_MAX,
        });
      }

      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          message: message.account.ERROR_PASSWORD_FORMAT,
        });
      }

      let id_role = 3;
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        password = hash;
        if (err) {
          console.log(err);
          return res.sendStatus(500);
        }

        let accountNameExists = await Account.hasByUsername(account_name);
        if (accountNameExists) {
          return res.status(400).json({
            message: message.account.ERROR_ACCOUNT_EXISTED,
          });
        }

        let emailExists = await Account.hasEmail(email);
        if (emailExists) {
          return res.status(401).json({
            message: message.account.ERROR_EMAIL_EXISTED,
          });
        }

        let avatar = await Information.selectAvatar();
        let acc = { account_name, real_name, email, password, id_role, avatar };
        let insertId = await Account.add(acc);

        res.status(200).json({
          message: message.account.REGISTER_SUCCESSFULL,
          data: insertId,
        });
      });
    } else {
      res.status(402).json({
        message: message.account.ERROR_REGISTER_VALIDATION,
      });
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({
      message: message.account.ERROR_OTHER,
    });
  }
});

/**
 * Thay đổi thông tin tài khoản, chỉ có thể đổi của chính bản thân
 *
 * @permission  phải đăng nhập thì mới được thực thi (user trở lên)
 * @return      401: Không được sửa thông tin của người khác
 *              400: Thiếu thông tin bắt buộc
 *              200: Cập nhật thành công, trả về tài khoản vừa cập nhật
 */
// TODO: Deprecated

function validateDateOfBirth(dateString) {
  const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
  if (!dateRegex.test(dateString)) {
    return "Ngày sinh không đúng định dạng (VD: dd-mm-yyyy)";
  }

  const [day, month, year] = dateString.split("-");

  const dob = new Date(`${year}-${month}-${day}`);

  const today = new Date();
  const age = today.getFullYear() - dob.getFullYear();

  if (age < 15) {
    return "Ngày sinh không phù hợp (tuổi dưới 15)";
  }

  if (age > 70) {
    return "Ngày sinh không hợp lệ (tuổi trên 70)";
  }

  return null;
}

router.put("/:id", Auth.authenGTUser, async (req, res, next) => {
  try {
    let updateId = req.params.id;
    let userId = Auth.tokenData(req).id_account;

    if (updateId != userId) {
      return res.status(401).json({
        message: "Không thể sửa đổi thông tin của người khác",
      });
    }

    if (!req.body.real_name) {
      res.status(400).json({
        message: "real_name là bắt buộc",
      });
    }

    const dateValidationResult = validateDateOfBirth(req.body.birth);

    if (dateValidationResult) {
      return res.status(400).json({
        message: dateValidationResult,
      });
    }

    let account = {
      real_name: req.body.real_name ?? "",
      birth: birth,
      gender: req.body.gender ?? 0,
      company: req.body.company ?? "",
      phone: req.body.phone ?? "",
      avatar: req.body.avatar ?? "",
    };

    let result = await Account.update(updateId, account);

    res.status(200).json({
      message: "Cập nhật thông tin tài khoản thành công",
      data: result,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      message: "Something wrong",
    });
  }
});

/**
 * Lấy thông tin của tài khoản
 * @permission  người đã đăng nhập
 * @returns     200: GET_SUCCESSFULL
 */
// TODO: Deprecated
router.get("/information", Auth.authenGTUser, async (req, res, next) => {
  try {
    let acc = await Account.selectId(Auth.tokenData(req).id_account);
    return res.status(200).json({
      message: message.account.GET_SUCCESSFULL,
      data: acc,
    });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * Lấy avatar của mình
 */
router.get("/avatar", Auth.authenGTUser, async (req, res, next) => {
  try {
    let id_account = Auth.tokenData(req).id_account;
    let path = await Account.selectAvatar(id_account);
    console.log(path);
    let image = fs.readFile(path, (err, data) => {
      if (err) {
        return res.sendStatus(500);
      } else {
        return res.end(data);
      }
    });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * Lấy avatar của người khác
 */
router.get("/:id_account/avatar", async (req, res, next) => {
  try {
    let id_account = req.params.id_account;
    let exist = await Account.has(id_account);
    if (exist) {
      let path = await Account.selectAvatar(id_account);
      let image = fs.readFile(path, (err, data) => {
        console.log(path);
        if (err) {
          return res.sendStatus(500);
        } else {
          return res.end(data);
        }
      });
    } else {
      return res.status(404).json({
        message: message.account.ERROR_ACCOUNT_NOT_FIND,
      });
    }
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * Lấy danh sách tài khoản
 * @query       page: Nếu có thì lấy danh sách theo trang (trang bắt đầu từ 1)
 *                    Nếu không thì lấy tất cả
 * @permission  có token thì sẽ kiểm tra thêm các trạng thái follow,...
 * @returns     200: GET_SUCCESSFULL
 *              401: Authorization header không có token
 *              403: token không chính xác hoặc đã hết hạn
 */
router.get("/all", async (req, res, next) => {
  try {
    let page = req.query.page;

    const authorizationHeader = req.headers["authorization"];

    let list = [];
    let ids;
    if (page) ids = await Account.selectAllId(page);
    else ids = await Account.selectAllId();

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

      for (let accId of ids) {
        let acc = await Account.selectIdStatus(accId.id_account, idUser);
        list.push(acc);
      }

      // let acc = await Account.selectId(Auth.tokenData(req).id_account);
      // list = await Account.selectAllByAccount(acc.id_account);
    } else {
      for (let accId of ids) {
        let acc = await Account.selectId(accId.id_account);
        list.push(acc);
      }
    }
    return res.status(200).json({
      message: message.account.GET_SUCCESSFULL,
      data: list,
    });
    // }
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * Tìm kiếm tài khoản theo từ khóa
 * @query       k
 * @permission  Xử lý theo token
 * @return      200: GET_SUCCESSFULL
 *              400: NOT_KEYWORD_SEARCH
 *              401: Authorization header không có token
 *              403: token không chính xác hoặc đã hết hạn
 */
router.get("/search", async (req, res, next) => {
  try {
    let { k } = req.query;
    if (!k || k.trim().length == 0) {
      return res.status(400).json({
        message: message.account.NOT_KEYWORD_SEARCH,
      });
    }

    k = k.toLowerCase();

    let page = req.query.page;

    const authorizationHeader = req.headers["authorization"];

    let list = [];
    let ids;
    if (page) ids = await Account.getSearch(k, page);
    else ids = await Account.getSearch(k);

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

      for (let accId of ids) {
        let acc = await Account.selectIdStatus(accId.id_account, idUser);
        list.push(acc);
      }
    } else {
      for (let accId of ids) {
        let acc = await Account.selectId(accId.id_account);
        list.push(acc);
      }
    }
    return res.status(200).json({
      message: message.account.GET_SUCCESSFULL,
      data: list,
    });
    // }
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * Lấy danh sách tất cả thông đã bị khóa
 *
 * @permission  Chỉ Admin
 * @return      200: GET_SUCCESSFULL
 *              403: ERROR_ACCOUNT_UNAUTHORIZATION
 */
// TODO: Cần làm lại
router.get("/account_locked/all", Auth.authenAdmin, async (req, res, next) => {
  try {
    let acc = await Account.selectId(Auth.tokenData(req).id_account);
    if (acc.status != 0) {
      return res.status(403).json({
        message: message.account.ERROR_ACCOUNT_UNAUTHORIZATION,
      });
    } else {
      var list = await LockAccount.selectAll();

      return res.status(200).json({
        message: message.account.GET_SUCCESSFULL,
        data: list,
      });
    }
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * Lấy thông tin 1 tài khoản theo id
 * @params      id
 * @permission  Theo token
 * @return      200: GET_SUCCESSFULL
 *              404: Không tìm thấy
 */
router.get("/:id", async (req, res, next) => {
  try {
    let id = req.params.id;
    let accountExists = await Account.has(id);

    if (accountExists) {
      const authorizationHeader = req.headers["authorization"];
      let idUser = false;

      if (authorizationHeader) {
        const token = authorizationHeader.split(" ")[1];
        if (!token) return res.sendStatus(401);

        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, data) => {
          if (err) {
            console.log(err);
            return res.sendStatus(401);
          }
        });

        idUser = Auth.tokenData(req).id_account;
      }

      let result;
      if (idUser === false) result = await Account.selectId(id);
      else result = await Account.selectIdStatus(id, idUser);

      res.status(200).json({
        message: message.account.GET_SUCCESSFULL,
        data: result,
      });
    } else {
      res.status(404).json({
        message: message.account.ERROR_ACCOUNT_NOT_FIND,
      });
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({
      message: message.account.ERROR_OTHER,
    });
  }
});

/**
 * Lấy thông tin chức vụ của 1 tài khoản theo id
 * @permission  Ai cũng có thể thực thi
 * @return      200: GET_SUCCESSFULL
 *              404: ERROR_ACCOUNT_NOT_FIND
 */
router.get("/:id/role", async (req, res, next) => {
  try {
    let accountExists = await Account.has(id);

    if (accountExists) {
      let result = await Account.selectRole(req.params.id);
      res.status(200).json({
        message: message.account.GET_SUCCESSFULL,
        data: result,
      });
    } else {
      res.status(404).json({
        message: message.account.ERROR_ACCOUNT_NOT_FIND,
      });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({
      message: message.account.ERROR_OTHER,
    });
  }
});

/**
 * Lấy tất cả bài viết (public, đã kiểm duyệt) của một tài khoản
 * @query       page
 * @permisson   Ai cũng có thể thực thi
 * @return      200: GET_SUCCESSFULL
 *              404: ERROR_ACCOUNT_NOT_FIND
 */
router.get("/:id/posts", async (req, res, next) => {
  try {
    let idAcc = req.params.id;
    let page = req.query.page;

    let accExists = await Account.has(idAcc);
    if (accExists) {
      let acc = await Account.selectId(idAcc);

      let postsId;
      if (page) postsId = await Post.getListPostIdOfAccount(idAcc, page);
      else postsId = await Post.getListPostIdOfAccount(idAcc);

      let data = [];
      for (let i = 0; i < postsId.length; i++) {
        let post = await Post.selectId(postsId[i].id_post);
        let tags = await Post.selectTagsOfPost(postsId[i].id_post);
        data.push({
          post: post,
          author: acc,
          tags: tags,
        });
      }
      res.status(200).json({
        message: message.account.GET_SUCCESSFULL,
        data: data,
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
 * Lấy danh sách bài viết bookmark của 1 tài khoản
 * @query       page
 * @permission  Đăng nhập mới được thực thi
 * @return      200: GET_SUCCESSFULL
 *              404: ERROR_ACCOUNT_NOT_FIND
 */
router.get("/:id/bookmarks", async (req, res, next) => {
  try {
    let id = req.params.id;
    let page = req.query.page;

    let accExists = await Account.has(id);
    if (accExists) {
      let postsId;
      if (page) postsId = await Bookmark.list(id, page);
      else postsId = await Bookmark.list(id);

      let data = [];
      for (let i = 0; i < postsId.length; i++) {
        let post = await Post.selectId(postsId[i].id_post);
        let acc = await Account.selectId(post.id_account);
        let tags = await Post.selectTagsOfPost(postsId[i].id_post);
        data.push({
          post: post,
          author: acc,
          tags: tags,
        });
      }

      res.status(200).json({
        message: message.account.GET_SUCCESSFULL,
        data: data,
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
 * Lấy danh sách các thẻ mà tài khoản đang follow
 * @params      id tài khoản cần tra cứu
 * @permission  Theo token
 * @return      200: GET_SUCCESSFULL
 *              404: ERROR_ACCOUNT_NOT_FIND
 */
router.get("/:id/follow_tag", async (req, res, next) => {
  try {
    let id = req.params.id;

    const authorizationHeader = req.headers["authorization"];

    let idUser = false;

    if (authorizationHeader) {
      const token = authorizationHeader.split(" ")[1];
      if (!token) return res.sendStatus(401);

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, data) => {
        if (err) {
          console.log(err);
          return res.sendStatus(401);
        }
      });

      idUser = Auth.tokenData(req).id_account;
    }

    let accExists = await Account.has(id);
    if (accExists) {
      let result;
      if (idUser === false) result = await FollowTag.list(id);
      else result = await FollowTag.listStatus(id, idUser);

      res.status(200).json({
        message: message.account.GET_SUCCESSFULL,
        data: result,
      });
    } else {
      res.status(404).json({
        message: message.account.ERROR_ACCOUNT_NOT_FIND,
      });
    }
  } catch (error) {
    res.sendStatus(500);
  }
});

/**
 * Lấy danh sách tài khoản theo dõi TK có id cho trước
 * @params      id tài khoản cần tra cứu
 * @permission  Theo token
 * @return      200: GET_SUCCESSFULL
 *              404: ERROR_ACCOUNT_NOT_FIND
 */
router.get("/:id/follower", async (req, res, next) => {
  try {
    let id = req.params.id;

    const authorizationHeader = req.headers["authorization"];

    let idUser = false;

    if (authorizationHeader) {
      const token = authorizationHeader.split(" ")[1];
      if (!token) return res.sendStatus(401);

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, data) => {
        if (err) {
          console.log(err);
          return res.sendStatus(401);
        }
      });

      idUser = Auth.tokenData(req).id_account;
    }

    let accExists = await Account.has(id);
    if (accExists) {
      let result = await FollowAccount.listFollowingOf(id);
      let data = [];
      for (let accFollowing of result) {
        let acc;
        if (idUser === false)
          acc = await Account.selectId(accFollowing.id_following);
        else
          acc = await Account.selectIdStatus(accFollowing.id_following, idUser);
        data.push(acc);
      }

      res.status(200).json({
        message: message.account.GET_SUCCESSFULL,
        data: data,
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
 * Lấy danh sách tài khoản mà TK có id cho trước theo dõi
 * @params      id tài khoản cần tra cứu
 * @permission  Theo token
 * @return      200: GET_SUCCESSFULL
 *              404: ERROR_ACCOUNT_NOT_FIND
 */
router.get("/:id/following", async (req, res, next) => {
  try {
    let id = req.params.id;

    const authorizationHeader = req.headers["authorization"];

    let idUser = false;

    if (authorizationHeader) {
      const token = authorizationHeader.split(" ")[1];
      if (!token) return res.sendStatus(401);

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, data) => {
        if (err) {
          console.log(err);
          return res.sendStatus(401);
        }
      });

      idUser = Auth.tokenData(req).id_account;
    }

    let accExists = await Account.has(id);
    if (accExists) {
      let result = await FollowAccount.listFollowerOf(id);
      let data = [];
      for (let accFollowing of result) {
        let acc;
        if (idUser === false)
          acc = await Account.selectId(accFollowing.id_follower);
        else
          acc = await Account.selectIdStatus(accFollowing.id_follower, idUser);
        data.push(acc);
      }

      res.status(200).json({
        message: message.account.GET_SUCCESSFULL,
        data: data,
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
 * Lấy điểm vote (mark) của người dùng có id
 *      mark = totalVoteUp - totalVoteDown
 *
 * @permission  Ai cũng có thể thực thi
 * @return      200: GET_SUCCESSFUL
 *              404: ERROR_ACCOUNT_NOT_FIND
 */
router.get("/:id/mark", async (req, res, next) => {
  try {
    let { id } = req.params;
    let accExists = await Account.has(id);
    if (accExists) {
      let totalUp = await Vote.getTotalVoteUp(id);
      let totalDown = await Vote.getTotalVoteDown(id);

      let mark = totalUp - totalDown;
      res.status(200).json({
        message: message.account.GET_SUCCESSFULL,
        data: {
          mark: mark,
          up: totalUp,
          down: totalDown,
        },
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
 * Lấy tổng số lượt xem tất cả bài viết mà người dùng đã viết
 *
 * @permission  Ai cũng có thể thực thi
 * @return      200: GET_SUCCESSFULL
 *              404: ERROR_ACCOUNT_NOT_FIND
 */
router.get("/:id/view", async (req, res, next) => {
  try {
    let { id } = req.params;
    let accExists = await Account.has(id);
    if (accExists) {
      let totalView = (await Post.getTotalView(id)) ?? 0;

      res.status(200).json({
        message: message.account.GET_SUCCESSFULL,
        data: parseInt(totalView),
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
 * Thay đổi chức vụ của tài khoản theo id
 * @params      id: tài khoản muốn thay đổi chức vụ
 *              id_role_new: id chức vụ mới
 *
 * @permisson   Moder trở lên mới được thực thi
 *              Người ra lệnh phải có chức vụ cao hơn người được thay đổi
 *              Chức vụ mới nhỏ hơn chức vụ của người ra lệnh
 *
 * @return      200: UPDATE_SUCCESSFULL
 *              400: UPDATE_FAILED
 *              403: ERROR_ACCOUNT_UNAUTHORIZATION
 */
router.put(
  "/:id/role/:id_role_new",
  Auth.authenGTModer,
  async (req, res, next) => {
    try {
      let { id, id_role_new } = req.params;
      let id_boss = Auth.tokenData(req).id_account;

      let boss = await Account.selectRole(id_boss);
      let user = await Account.selectRole(id);

      if (boss.id_role >= user.id_role || id_role_new <= boss.id_role) {
        res.status(403).json({
          message: message.account.ERROR_ACCOUNT_UNAUTHORIZATION,
        });
      } else {
        // Check chức vụ tồn tại hay không rồi mới được set
        let existsChucVu = await Role.has(id_role_new);

        if (existsChucVu) {
          let result = await Account.updateRole(id, id_role_new);
          res.status(200).json({
            message: message.account.UPDATE_SUCCESSFULL,
            data: result,
          });
        } else {
          res.status(400).json({
            message: message.account.UPDATE_FAILED,
          });
        }
      }
    } catch (e) {
      console.error(e);
      res.status(500).json({
        message: message.account.ERROR_OTHER,
      });
    }
  }
);

/**
 * Thay đổi thông tin tài khoản, chỉ có thể đổi của chính bản thân
 * @body        real_name, birth, gender, company, phone, avatar
 * @permission  Đăng nhập
 * @return      400: REAL_NAME_VALIDATION
 *              200: UPDATE_SUCCESSFULL
 */
router.put("/change/information", Auth.authenGTUser, async (req, res, next) => {
  try {
    let id_account = Auth.tokenData(req).id_account;

    if (!req.body.real_name) {
      res.status(400).json({
        message: message.account.REAL_NAME_VALIDATION,
      });
    }

    if (req.body.real_name.length > 50) {
      return res.status(402).json({
        message: message.account.ERROR_REAL_NAME_VALIDATION,
      });
    }

    let birth = null;
    if (req.body.birth !== "") birth = req.body.birth;

    var account = {
      real_name: req.body.real_name ?? "",
      birth: birth,
      gender: req.body.gender ?? 0,
      email: req.body.email ?? "",
      phone: req.body.phone ?? "",
      avatar:
        req.body.avatar ??
        "https://thumbs.dreamstime.com/b/default-avatar-profile-icon-social-media-user-vector-default-avatar-profile-icon-social-media-user-vector-portrait-176194876.jpg",
    };

    let result = await Account.update(id_account, account);

    res.status(200).json({
      message: message.account.UPDATE_SUCCESSFULL,
      data: result,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      message: message.account.ERROR_OTHER,
    });
  }
});

/**
 * Thay đổi thông tin tài khoản, chỉ có thể đổi của chính bản thân
 * @body        real_name, birth, gender, company, phone, avatar
 * @permission  Đăng nhập
 * @return      400: VALIDATION_REQUIRED
 *              401: UPDATE_FAILED
 *              200: UPDATE_SUCCESSFULL
 */
router.put("/update/information", Auth.authenGTUser, async (req, res, next) => {
  try {
    let { real_name, birth, email, gender, phone } = req.body;
    let id_account = Auth.tokenData(req).id_account;
    let acc = await Account.selectId(id_account);

    if (!real_name || real_name.trim() === "") {
      return res.status(401).json({
        message: message.account.REAL_NAME_VALIDATION,
      });
    }

    if (req.body.real_name.length > 50) {
      return res.status(402).json({
        message: message.account.ERROR_REAL_NAME_VALIDATION,
      });
    }

    if (!birth) {
      return res.status(401).json({
        message: message.account.BIRTH_VALIDATION,
      });
    }

    const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
    if (!dateRegex.test(birth)) {
      return res.status(401).json({
        message: message.account.BIRTH_FORMAT,
      });
    }

    const birthDate = new Date(birth);
    const today = new Date();
    const age =
      today.getFullYear() -
      birthDate.getFullYear() -
      (today.getMonth() < birthDate.getMonth() ||
      (today.getMonth() === birthDate.getMonth() &&
        today.getDate() < birthDate.getDate())
        ? 1
        : 0);

    if (age > 75 || age < 15) {
      return res.status(401).json({
        message: message.account.BIRTH_NOT_VALID,
      });
    }

    if (!phone || phone.trim() === "") {
      return res.status(401).json({
        message: message.account.PHONE_VALIDATION,
      });
    }

    regex = /((09|03|07|08|05)+([0-9]{8})\b)/g;
    if (!regex.test(phone)) {
      return res.status(401).json({
        message: message.account.PHONE_NOT_VALID,
      });
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (email.length > 50) {
      return res.status(402).json({
        message: message.account.ERROR_EMAIL_VALIDATION,
      });
    }

    if (!emailRegex.test(email)) {
      return res.status(403).json({
        message: message.account.ERROR_EMAIL_INVALID_FORMAT,
      });
    }

    let avatar = "";

    if (req.files && req.files.avatar) {
      let idImage = await MyDrive.uploadImage(req.files.avatar, id_account);
      if (!idImage) {
        return res.status(401).json({
          message: message.account.UPDATE_FAILED,
        });
      } else {
        let oldPath = await Account.selectAvatar(id_account);
        let oldImageId = MyDrive.getImageId(oldPath);

        let deleteOldImage = await MyDrive.deleteFiles(oldImageId);

        avatar = "https://drive.google.com/uc?export=view&id=" + idImage;
        console.log(avatar);
      }
    }

    let account = {
      real_name: real_name,
      birth: birth,
      gender: gender ?? 0,
      email: email,
      phone: phone,
      avatar:
        avatar ??
        "https://thumbs.dreamstime.com/b/default-avatar-profile-icon-social-media-user-vector-default-avatar-profile-icon-social-media-user-vector-portrait-176194876.jpg",
    };

    let result = await Account.update(id_account, account);

    res.status(200).json({
      message: message.account.UPDATE_SUCCESSFULL,
      data: result,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      message: message.account.ERROR_OTHER,
    });
  }
});

/**
 * Mở khóa tài khoản
 * @params      id người muốn được mở khóa
 * @permisson   Moder trở lên
 * @return      200: UNLOCK_SUCCESSFULL
 *              403: ERROR_ACCOUNT_UNAUTHORIZATION
 *              404: ERROR_ACCOUNT_NOT_FIND
 */
router.patch("/:id/unlock", Auth.authenGTModer, async (req, res, next) => {
  let id_account_lock = req.params.id;
  let id_account_boss = Auth.tokenData(req).id_account;
  let exist = await Account.has(id_account_lock);

  if (!exist) {
    return res.status(404).json({
      message: message.account.ERROR_ACCOUNT_NOT_FIND,
    });
  }

  let acc_boss = await Account.selectId(id_account_boss);
  let acc_lock = await Account.selectId(id_account_lock);

  if (
    acc_boss.account_status != 0 ||
    acc_boss.id_role >= acc_lock.id_role ||
    acc_lock.account_status == 2
  ) {
    return res.status(403).json({
      message: message.account.ERROR_ACCOUNT_UNAUTHORIZATION,
    });
  } else {
    let unlock = Account.updateStatus(id_account_lock, 0);
    let notify = Notification.addNotification(
      id_account_lock,
      "Tài khoản của bạn đã được mở khóa",
      `/account/${id_account_lock}`
    );
    return res.status(200).json({
      message: message.account.UNLOCK_SUCCESSFULL,
    });
  }
});

/**
 * Khóa vĩnh viễn
 * @params      id: id người bị khóa
 * @body        reason
 * @permisson   Admin
 * @return      200: LOCK_SUCCESSFULL
 *              400: ERROR_BAN_VALIDATION
 *              404: ERROR_ACCOUNT_NOT_FIND
 */
router.patch("/:id/die", Auth.authenAdmin, async (req, res, next) => {
  try {
    let id_account_lock = req.params.id;
    let reason = req.body.reason;
    let exist = Account.has(id_account_lock);
    if (!exist) {
      return res.status(404).json({
        message: message.account.ERROR_ACCOUNT_NOT_FIND,
      });
    }
    let acc_lock = Account.selectId(id_account_lock);

    if (reason) {
      let save = LockAccount.add(
        id_account_lock,
        Auth.tokenData(req).id_account,
        reason,
        0
      );
      let notify = Notification.addNotification(
        id_account_lock,
        `Tài khoản của bạn đã bị khóa vô thời hạn`,
        `/account/${id_account_lock}`
      );
      let kill = Account.updateStatus(id_account_lock, 2);
      res.status(200).json({
        message: message.account.LOCK_SUCCESSFULL,
      });
    } else {
      return res.status(400).json({
        message: message.account.ERROR_BAN_VALIDATION,
      });
    }
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * Mở khóa
 * @params      id: id người cần mở khóa
 * @permisson   Admin
 * @return      200: UNLOCK_SUCCESSFULL
 *              404: ERROR_ACCOUNT_NOT_FIND
 */
router.patch("/:id/revive", Auth.authenAdmin, async (req, res, next) => {
  let id_account_lock = req.params.id;
  let exist = Account.has(id_account_lock);

  if (!exist) {
    return res.status(404).json({
      message: message.account.ERROR_ACCOUNT_NOT_FIND,
    });
  }

  let acc_lock = Account.selectId(id_account_lock);
  let unlock = Account.updateStatus(id_account_lock, 0);
  let notify = Notification.addNotification(
    id_account_lock,
    "Tài khoản của bạn đã được mở khóa",
    `/account/${id_account_lock}`
  );
  return res.status(200).json({
    message: message.account.UNLOCK_SUCCESSFULL,
  });
});

/**
 * Cập nhật logo ver 2
 * @body   image
 */
router.put("/update/avatar", Auth.authenGTUser, async (req, res, next) => {
  try {
    if (req.files) {
      let file = req.files.image;

      if (!file) {
        return res.status(400).json({
          message: "Tải file không thành công",
        });
      } else {
        let id_account = Auth.tokenData(req).id_account;

        let idImage = await MyDrive.uploadImage(file, id_account);

        if (!idImage) {
          return res.status(400).json({
            message: "Lỗi upload avatar",
          });
        } else {
          let oldPath = await Account.selectAvatar(id_account);
          let oldImageId = MyDrive.getImageId(oldPath);

          let deleteOldImage = await MyDrive.deleteFiles(oldImageId);

          let path = "https://drive.google.com/uc?export=view&id=" + idImage;
          let update = await Account.updateAvatar(id_account, path);

          return res.status(200).json({
            message: "cập nhật avatar thành công: ",
            data: path,
          });
        }
      }
    } else {
      return res.status(400).json({
        message: "Không có hình ảnh được tải lên",
      });
    }
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

function isNumber(n) {
  return /^-?[\d.]+(?:e-?\d+)?$/.test(n);
}

async function unLockAccount(id_account) {
  let acc = await Account.selectId(id_account);
  if (acc.status == 1) {
    let update = Account.updateStatus(id_account, 0);
    let notify = Notification.addNotification(
      id_account,
      "Tài khoản của bạn đã được mở khóa",
      `/account/${id_account}`
    );
  }
}

function setTimeUnlock(id_account_lock, time) {
  setTimeout(unLockAccount, time, id_account_lock);
}

function deleteCode(id_verification) {
  let del = Verification.delete(id_verification);
}

async function autoDeleteCode(id_verification) {
  let minute = await Information.selectCode();

  setTimeout(deleteCode, minute * 1000 * 60, id_verification);
}

async function createCode() {
  var result = "";
  for (var i = 0; i < 6; i++) {
    result += String(Math.floor(Math.random() * 10));
  }
  return result;
}

module.exports = router;
