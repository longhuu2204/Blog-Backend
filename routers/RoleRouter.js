const express = require("express");
const router = express.Router();
const Auth = require("../auth");
const Role = require("../modules/RoleModule");
const message = require("../common/Message");

/**
 * Danh sách chức vụ
 * @params      i
 * @body
 * @permisson   moder, admin
 * @return      200: GET_SUCCESSFULL
 */
router.get("/", Auth.authenGTModer, async (req, res, next) => {
  try {
    let result = await Role.selectAll();
    res.status(200).json({
      message: message.common.GET_SUCCESSFULL,
      data: result,
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      message: message.common.ERROR_OTHER,
    });
  }
});

/**
 * Tìm chức vụ
 * @params
 * @body
 * @permisson   moder, admin
 * @return      200: ACTION_SUCCESSFULL
 *              404: NOT_FOUND
 */
router.get("/:id", Auth.authenGTModer, async (req, res, next) => {
  try {
    let id = req.params.id;

    let exists = await Role.has(id);

    if (exists) {
      let result = await Role.selectId(req.params.id);
      res.status(200).json({
        message: message.common.ACTION_SUCCESSFULL,
        data: result,
      });
    } else {
      res.status(404).json({
        message: message.common.NOT_FOUND,
      });
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({
      message: message.common.ERROR_OTHER,
    });
  }
});

module.exports = router;
