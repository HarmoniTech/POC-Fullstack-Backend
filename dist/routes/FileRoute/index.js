"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const nodemailer_1 = __importDefault(require("nodemailer"));
const js_base64_1 = require("js-base64");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const UserModel_1 = __importDefault(require("../../model/UserModel"));
const middleware_1 = require("../../middleware");
const config_1 = require("../../config");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Create a new instance of the Express Router
const FileRouter = (0, express_1.Router)();
// @route    GET api/users
// @desc     Get user by token
// @access   Private
FileRouter.get("/", middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield UserModel_1.default.findById(req.user.id).select([
            "-password",
            "-mnemonic",
            "-role",
            "-referrerlId",
        ]);
        res.json(user);
    }
    catch (err) {
        console.error(err.message);
        return res.status(500).send({ error: err });
    }
}));
// @route    POST api/users/signup
// @desc     Register user
// @access   Public
FileRouter.post("/signup", (0, express_validator_1.check)("username", "Username is required").notEmpty(), (0, express_validator_1.check)("email", "Please include a valid email").isEmail(), (0, express_validator_1.check)("password", "Please enter a password with 12 or more characters").isLength({ min: 12 }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const transporter = nodemailer_1.default.createTransport({
            service: process.env.EMAIL_SERVICE,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
        // Provide a secret key type, it can generally be a string or a buffer
        const secretKey = "ourSecretKey";
        // Define the payload
        const payloadMail = {
            data: "Token Data",
        };
        // Generate the JWT token with a specified expiry time
        const tokenMail = jsonwebtoken_1.default.sign(payloadMail, secretKey, {
            expiresIn: "10m",
        });
        const mailConfigurations = {
            // It should be a string of sender/server email
            from: process.env.EMAIL_USER,
            to: req.body.email,
            // Subject of Email
            subject: "Email Verification",
            // This would be the text of email body
            text: `Hi there, you have recently entered your 
        email on our website. 
    
        Please follow the given link to verify your email 
        https://poc-fullstack-frontend.vercel.app/verify/${tokenMail} 
    
        Thanks`,
        };
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array() });
        }
        const { username, email, password, encodedReferrer } = req.body;
        const userExists = yield UserModel_1.default.findOne({ email });
        if (userExists) {
            return res.status(400).json({ error: "User already exists" });
        }
        let referrerId = null;
        if (encodedReferrer) {
            const referrerEmail = (0, js_base64_1.decode)(encodedReferrer);
            const referrer = yield UserModel_1.default.findOne({ email: referrerEmail });
            referrerId = (referrer === null || referrer === void 0 ? void 0 : referrer._id.toString()) || null;
        }
        const salt = yield bcryptjs_1.default.genSalt(10);
        const hashedPassword = yield bcryptjs_1.default.hash(password, salt);
        const user = new UserModel_1.default({
            username,
            email,
            password: hashedPassword,
            verified: false,
        });
        user
            .save()
            .then((response) => {
            transporter.sendMail(mailConfigurations, function (error, info) {
                if (error) {
                    console.log(error);
                    return res.json({ success: false, mail: "Can't send email!" });
                }
                else {
                    console.log("Email Sent Successfully");
                    console.log(info);
                    return res.json({ success: true });
                }
            });
        })
            .catch((err) => {
            console.log(err);
            return res.json({ success: false, mail: "Can't regist user!" });
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).send({ error });
    }
}));
// @route    GET api/users/verity/:token
// @desc     Is user verified
// @access   Public
FileRouter.get("/verify/:token", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token } = req.params;
        console.log(token);
        // Verifying the JWT token
        jsonwebtoken_1.default.verify(token, "ourSecretKey", (err, decode) => {
            if (err) {
                console.log(err);
                return res
                    .status(400)
                    .json({ success: false, error: "Email verification failed!" });
            }
            else {
                // User.findOneAndUpdate({email: req.body.email}, {$set: {email: req.body.email, password: hashedPassword, username: req.body.username, verified: true}}, {new: true});
                return res.json({
                    success: true,
                    mail: "Email verification successed!",
                });
            }
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).send({ error });
    }
}));
// @route    Post api/users/forgotPassword
// @desc     Is user verified
// @access   Public
FileRouter.post("/forgotPassword", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const email = req.body.email;
        UserModel_1.default.findOne({ email: email })
            .then((data) => {
            if (data) {
                const transporter = nodemailer_1.default.createTransport({
                    service: process.env.EMAIL_SERVICE,
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS,
                    },
                });
                // Provide a secret key type, it can generally be a string or a buffer
                const secretKey = "ourSecretKey";
                // Define the payload
                const payloadMail = {
                    data: "Reset Data",
                };
                // Generate the JWT token with a specified expiry time
                const tokenMail = jsonwebtoken_1.default.sign(payloadMail, secretKey, {
                    expiresIn: "10m",
                });
                const mailConfigurations = {
                    // It should be a string of sender/server email
                    from: process.env.EMAIL_USER,
                    to: email,
                    // Subject of Email
                    subject: "Reset Password",
                    // This would be the text of email body
                    text: `Hi there, you want to reset your password. 
        
            Please follow the given link to verify your email 
            https://poc-fullstack-frontend.vercel.app/${email}/reset-password/${tokenMail} 
        
            Thanks`,
                };
                transporter.sendMail(mailConfigurations, function (error, info) {
                    if (error) {
                        console.log(error);
                        return res.json({ success: false, mail: "Can't send email!" });
                    }
                    else {
                        console.log("Email Sent Successfully");
                        console.log(info);
                        return res.json({
                            success: true,
                            mail: "Email verification link sent!",
                        });
                    }
                });
            }
            else {
                return res.json({ success: false, mail: "Can't find email!" });
            }
        })
            .catch((err) => {
            console.log(err);
            return res.json({ success: false, mail: "Can't find user!" });
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).send({ error });
    }
}));
// @route    Post api/users/resetPassword
// @desc     Is user verified
// @access   Public
FileRouter.post("/resetPassword", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const email = req.body.email;
        const token = req.body.token;
        const newPassword = req.body.password;
        UserModel_1.default.findOne({ email: email })
            .then((data) => {
            if (data) {
                jsonwebtoken_1.default.verify(token, "ourSecretKey", (err, decode) => {
                    if (err) {
                        console.log(err);
                        return res.status(400).json({
                            success: false,
                            error: "Reset password failed because email verification failure!",
                        });
                    }
                    else {
                        bcryptjs_1.default.genSalt(10, (err, salt) => {
                            if (err) {
                                console.error("Error generating salt:", err);
                                return res.status(400).json({ error: "Incorrect password" });
                            }
                            else {
                                bcryptjs_1.default.hash(newPassword, salt, (err, hashedPassword) => {
                                    if (err) {
                                        console.error("Error hashing password:", err);
                                        return res
                                            .status(400)
                                            .json({ error: "Incorrect password" });
                                    }
                                    else {
                                        UserModel_1.default.findOneAndUpdate({ email: email }, {
                                            $set: {
                                                email: email,
                                                password: hashedPassword,
                                                username: data.username,
                                                verified: true,
                                            },
                                        }, { new: true })
                                            .then((data) => {
                                            return res.json({
                                                success: true,
                                                mail: "Reset password successed!",
                                            });
                                        })
                                            .catch((errors) => {
                                            console.log(errors);
                                            return res
                                                .status(400)
                                                .json({ error: "Reset password failed!" });
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
            else {
                return res.json({ success: false, mail: "Can't find email!" });
            }
        })
            .catch((err) => {
            console.log(err);
            return res.json({ success: false, mail: "Can't find user!" });
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).send({ error });
    }
}));
// @route    POST api/users/signin
// @desc     Authenticate user & get token
// @access   Public
FileRouter.post("/signin", (0, express_validator_1.check)("email", "Please include a valid email").isEmail(), (0, express_validator_1.check)("password", "Password is required").exists(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(req.body);
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array() });
    }
    const { email, password, checked } = req.body;
    try {
        let user = yield UserModel_1.default.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: "Invalid Email" });
        }
        const isMatch = yield bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            console.log(isMatch);
            return res.status(400).json({ error: "Incorrect password" });
        }
        const payload = {
            user: {
                email: user.email,
            },
        };
        jsonwebtoken_1.default.sign(payload, config_1.JWT_SECRET, { expiresIn: checked ? "90 days" : "5 days" }, (err, token) => {
            if (err)
                throw err;
            return res.json({
                authToken: token
            });
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).send({ error: error });
    }
}));
exports.default = FileRouter;