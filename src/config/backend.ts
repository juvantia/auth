import Passwordless from "supertokens-node/recipe/passwordless";
import Session from "supertokens-node/recipe/session";
import { TypeInput } from "supertokens-node/types";
import Dashboard from "supertokens-node/recipe/dashboard";
import JWT from "supertokens-node/recipe/jwt";
import supertokens from "supertokens-node";

export const backendConfig = (): TypeInput => {
    return {
        framework: "custom",
        supertokens: {
            // https://try.supertokens.com is for demo purposes. Replace this with the address of your self-hosted instance.
            connectionURI: process.env.SUPERTOKENS_CONNECTION_URI || "http://localhost:3567",
            apiKey: process.env.SUPERTOKENS_API_KEY,
        },
        appInfo: {
            appName: "Juvantia Auth",
            apiDomain: process.env.NEXT_PUBLIC_API_DOMAIN || "http://localhost:3001",
            websiteDomain: process.env.NEXT_PUBLIC_WEBSITE_DOMAIN || "http://localhost:3001",
            apiBasePath: "/api/auth/",
            websiteBasePath: "/auth",
        },
        recipeList: [
            Passwordless.init({
                contactMethod: "EMAIL",
                flowType: "USER_INPUT_CODE",
                // Здесь будет логика отправки писем через SMTP заказчика
                emailDelivery: {
                    override: (originalImplementation) => {
                        return {
                            ...originalImplementation,
                            sendEmail: async (input) => {
                                console.log("OTP Code locally:", input.userInputCode);

                                const nodemailer = require("nodemailer");

                                const transporter = nodemailer.createTransport({
                                    host: process.env.SMTP_HOST,
                                    port: Number(process.env.SMTP_PORT),
                                    secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
                                    auth: {
                                        user: process.env.SMTP_USER,
                                        pass: process.env.SMTP_PASS,
                                    },
                                });

                                const mailOptions = {
                                    from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
                                    to: input.email,
                                    subject: "Your Login Code",
                                    html: `
                                        <div style="font-family: Arial, sans-serif; background-color: #000; color: #fff; padding: 40px; text-align: center; border-radius: 10px;">
                                            <h1 style="color: #3b82f6;">Juvantia Auth</h1>
                                            <p style="font-size: 18px; color: #ccc;">Your login code is:</p>
                                            <div style="font-size: 32px; font-weight: bold; margin: 20px 0; letter-spacing: 5px; color: #fff;">${input.userInputCode}</div>
                                            <p style="font-size: 14px; color: #666;">If you didn't request this code, you can safely ignore this email.</p>
                                        </div>
                                    `,
                                };

                                try {
                                    await transporter.sendMail(mailOptions);
                                    console.log("Email sent successfully to", input.email);
                                } catch (error) {
                                    console.error("Error sending email:", error);
                                }
                            },
                        };
                    },
                },
            }),
            Session.init({
                cookieDomain: (!process.env.NEXT_PUBLIC_API_DOMAIN || process.env.NEXT_PUBLIC_API_DOMAIN.includes("localhost"))
                    ? undefined
                    : ".juvantia.org",
                cookieSameSite: "lax",
                // Force cookie mode explicitly on the backend
                getTokenTransferMethod: () => "cookie",
                antiCsrf: "NONE",
                // ОЧЕНЬ ВАЖНО: разрешить JS читать токен и генерировать именно JWT!
                exposeAccessTokenToFrontendInCookieBasedAuth: true,
                override: {
                    functions: (originalImplementation) => {
                        return {
                            ...originalImplementation,
                            createNewSession: async function (input) {
                                let email = undefined;
                                let name = undefined;
                                let avatar_url = undefined;

                                try {
                                    const user = await supertokens.getUser(input.userId);
                                    if (user && user.emails && user.emails.length > 0) {
                                        email = user.emails[0];
                                    }

                                    // TODO: Fix path for standalone build
                                    // Fetch additional info from our MongoDB User model
                                    /*
                                    const User = (await import("../models/User")).default;
                                    const dbUser = await User.findOne({ supertokens_id: input.userId });
                                    if (dbUser) {
                                        name = dbUser.name;
                                        avatar_url = dbUser.avatar_url;
                                    }
                                    */
                                } catch (err) {
                                    console.error("Juvantia Auth: Error fetching user in createNewSession", err);
                                }

                                input.accessTokenPayload = {
                                    ...input.accessTokenPayload,
                                    // Alchemy custom audience
                                    aud: "b86126bc-ddd4-4ada-948f-3f5a3b81eb2e",
                                    name,
                                    avatar_url
                                };

                                if (email) {
                                    input.accessTokenPayload.email = email;
                                }

                                return originalImplementation.createNewSession(input);
                            },
                        };
                    },
                },
            }),
            JWT.init(),
            Dashboard.init(),
        ],
        isInServerlessEnv: true,
    };
};
