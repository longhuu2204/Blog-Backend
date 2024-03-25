const express = require("express");
const router = express.Router();
const Feedback = require("../modules/FeedbackModule");
const Auth = require("../auth");
const message = require("../common/Message");

/**
 * Lấy 1 feedback
 * @permission      admin
 * @params          id_feedback
 * @returns         200: ACTION_SUCCESSFULL
 *                  404: FEEDBACK_NOT_EXISTED
 */
router.get(
  "/information/:id_feedback",
  Auth.authenAdmin,
  async (req, res, next) => {
    try {
      let id_feedback = req.params.id_feedback;

      let exist = await Feedback.has(id_feedback);
      if (!exist) {
        return res.status(404).json({
          message: message.feedback.FEEDBACK_NOT_EXISTED,
        });
      }

      let read = await Feedback.updateRead(id_feedback);
      let data = await Feedback.selectID(id_feedback);

      return res.status(200).json({
        message: message.common.ACTION_SUCCESSFULL,
        data: data,
      });
    } catch (err) {
      console.log(err);
      return res.sendStatus(500);
    }
  }
);

/**
 * Lấy tất cả feedback chưa đọc
 * @permission      admin
 * @returns         200: ACTION_SUCCESSFULL
 */
router.get("/unread", Auth.authenAdmin, async (req, res, next) => {
  try {
    let data = [];
    data = await Feedback.selectUnread();

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
 * Lấy tất cả feedback
 * @permission       admin
 * @returns          200: GET_SUCCESSFULL
 */
router.get("/all", Auth.authenAdmin, async (req, res, next) => {
  try {
    let data = [];
    data = await Feedback.selectAll();

    return res.status(200).json({
      message: message.common.GET_SUCCESSFULL,
      data: data,
    });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * Lấy số lượng feedback
 * @permission       admin
 * @query            is_unread
 * @returns
 */
router.get("/all/amount", Auth.authenAdmin, async (req, res, next) => {
  try {
    let is_unread = req.query.is_unread;
    let amount;
    if (!is_unread) {
      is_unread = 0;
    }

    if (is_unread == 0) {
      amount = await Feedback.selectAmountAll();
    } else {
      amount = await Feedback.selectAmountUnread();
    }

    return res.json({
      message: message.common.GET_SUCCESSFULL,
      amount: amount,
    });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * Xóa feedback
 * @permission       admin
 * @params           id_feedback
 * @returns          200: DELETE_FEEDBACK_SUCCESSFULL
 *                   404: FEEDBACK_NOT_EXISTED
 */
router.delete("/:id_feedback", Auth.authenAdmin, async (req, res, next) => {
  try {
    let id_feedback = req.params.id_feedback;
    let exist = await Feedback.has(id_feedback);
    if (!exist) {
      return res.status(404).json({
        message: message.feedback.FEEDBACK_NOT_EXISTED,
      });
    } else {
      let deleted = await Feedback.delete(id_feedback);
      return res.status(200).json({
        message: message.feedback.DELETE_FEEDBACK_SUCCESSFULL,
      });
    }
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * Thêm feedback
 * @body             subject, content
 * @returns          200: ADD_FEEDBACK_SUCCESSFULL
 *                   400: ERROR_DATA
 */
router.post("/", Auth.authenGTUser, async (req, res, next) => {
  try {
    let id_account = Auth.tokenData(req).id_account;
    let subject = req.body.subject;
    let content = req.body.content;
    if (!subject || subject.trim() === "") {
      return res.status(400).json({
        message: message.feedback.ERROR_SUBJECT,
      });
    }
    if (!content || content.trim() === "") {
      return res.status(400).json({
        message: message.feedback.ERROR_CONTENT,
      });
    }
    if (subject && content) {
      let add = await Feedback.add(id_account, subject, content);
      return res.status(201).json({
        message: message.feedback.ADD_FEEDBACK_SUCCESSFULL,
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
 * Đánh dấu đã đọc phản hồi
 *
 * @permission       admin
 * @returns          200: BOOKMARK_FEEDBACK
 *                   404: FEEDBACK_NOT_EXISTED
 */
router.put("/:id_feedback/read", Auth.authenAdmin, async (req, res, next) => {
  try {
    let id_feedback = req.params.id_feedback;
    let exist = await Feedback.has(id_feedback);
    if (!exist) {
      return res.status(404).json({
        message: message.feedback.FEEDBACK_NOT_EXISTED,
      });
    } else {
      await Feedback.updateRead(id_feedback);
      return res.status(200).json({
        message: message.feedback.BOOKMARK_FEEDBACK,
      });
    }
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * Đánh dấu chưa đọc phản hồi
 *
 * @permission       admin
 * @returns          200: Đánh dấu chưa đọc phản hồi thành công!
 *                   404: FEEDBACK_NOT_EXISTED
 */
router.put("/:id_feedback/unread", Auth.authenAdmin, async (req, res, next) => {
  try {
    let id_feedback = req.params.id_feedback;
    let exist = await Feedback.has(id_feedback);
    if (!exist) {
      return res.status(404).json({
        message: message.feedback.FEEDBACK_NOT_EXISTED,
      });
    } else {
      await Feedback.updateUnRead(id_feedback);
      return res.status(200).json({
        message: "Đánh dấu chưa đọc phản hồi thành công!",
      });
    }
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

/**
 * Lấy 1 feedback, không đánh dấu đọc
 * @permission       admin
 * @params           id_feedback
 * @returns          200: GET_SUCCESSFULL
 *                   404: FEEDBACK_NOT_EXISTED
 */
router.get("/:id_feedback", Auth.authenAdmin, async (req, res, next) => {
  try {
    let id_feedback = req.params.id_feedback;

    let exist = await Feedback.has(id_feedback);
    if (!exist) {
      return res.status(400).json({
        message: message.feedback.FEEDBACK_NOT_EXISTED,
      });
    }

    let data = await Feedback.selectID(id_feedback);

    return res.status(200).json({
      message: message.common.GET_SUCCESSFULL,
      data: data,
    });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

module.exports = router;
