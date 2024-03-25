// var nodemailer = require('nodemailer');

// const mailer = {};

// var transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: 'samab1541@gmail.com',
//     pass: '1234567qety'
//   }
// });

// mailer.sendVerification = (userEmail, verification)=>{
//   var mailOptions = {
//       from: 'samab1541@gmail.com',
//       to: userEmail,
//       subject: 'Lấy lại mật khẩu',
//       text: 'Mã xác nhận của bạn là: ' + verification,
//   };
//   transporter.sendMail(mailOptions);
// }

// module.exports = mailer;

var nodemailer = require("nodemailer");
const { OAuth2Client } = require("google-auth-library");

const mail = {};

const GOOGLE_MAILER_CLIENT_ID =
  "255420694079-suauq776ufesuq7ohmtnidkf6ommqge1.apps.googleusercontent.com";
const GOOGLE_MAILER_CLIENT_SECRET = "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";
const GOOGLE_MAILER_REFRESH_TOKEN =
  "1//04-HOklH-C-nSCgYIARAAGAQSNwF-L9Irv6FbPP1B4RwgWMx1tVLZlwsgKTh_WxJm_B3bv4ZF44w2KJFw_TUwCTbVzvSBRBx3QSQ";
const ADMIN_EMAIL_ADDRESS = "pdhlong933@gmail.com";

const myOAuth2Client = new OAuth2Client(
  GOOGLE_MAILER_CLIENT_ID,
  GOOGLE_MAILER_CLIENT_SECRET
);
// Set Refresh Token vào OAuth2Client Credentials
myOAuth2Client.setCredentials({
  refresh_token: GOOGLE_MAILER_REFRESH_TOKEN,
});

myOAuth2Client
  .getAccessToken()
  .then((myAccessTokenObject) => {
    // Access Token sẽ nằm trong property 'token' trong Object mà chúng ta vừa get được ở trên
    const myAccessToken = myAccessTokenObject?.token;

    // Tạo một biến Transport từ Nodemailer với đầy đủ cấu hình, dùng để gọi hành động gửi mail
    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: ADMIN_EMAIL_ADDRESS,
        clientId: GOOGLE_MAILER_CLIENT_ID,
        clientSecret: GOOGLE_MAILER_CLIENT_SECRET,
        refresh_token: GOOGLE_MAILER_REFRESH_TOKEN,
        accessToken: myAccessToken,
      },
    });

    // Gọi hành động gửi email
    mail.sendVerification = (email, verification) => {
      var options = {
        from: "IT-NEWS",
        to: email,
        subject: "Verification",
        text: "Code của bạn là: " + verification,
      };
      transport.sendMail(options, function (error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log("Email sent: " + info.response);
        }
      });
    };

    // rest of your code
  })
  .catch((error) => {
    // Handle the error
    console.error("Error getting access token:", error);
  });
// mailOption là những thông tin gửi từ phía client lên thông qua API

module.exports = mail;
