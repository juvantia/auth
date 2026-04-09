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
                                        <div style="background-color: #111414; background-image: radial-gradient(#1a1f1e 1px, transparent 1px); background-size: 20px 20px; color: #fff; padding: 60px 20px; text-align: center; border-radius: 0; border: 1px solid #1a1f1e; max-width: 600px; margin: auto;">
                                            <style>
                                                @import url('https://fonts.googleapis.com/css2?family=Marcellus&family=Space+Grotesk:wght@400;600&display=swap');
                                            </style>
                                            
                                            <!-- Branding -->
                                            <h1 style="font-family: 'Marcellus', serif; font-weight: 400; font-size: 32px; text-transform: uppercase; letter-spacing: 0.35em; margin-bottom: 40px; color: #00FF88;">
                                                Juvantia Auth
                                            </h1>
                                            
                                            <p style="font-family: 'Space Grotesk', sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 0.25em; color: #66706e; margin-bottom: 20px;">
                                                Security Verification
                                            </p>
                                            
                                            <div style="background: rgba(0, 255, 136, 0.03); border: 1px solid rgba(0, 255, 136, 0.1); padding: 40px 20px; margin: 20px 0; border-radius: 4px;">
                                                <p style="font-family: 'Space Grotesk', sans-serif; font-size: 14px; color: #a1aeac; margin-bottom: 30px;">Your authentication code:</p>
                                                <div style="font-family: 'Space Grotesk', sans-serif; font-size: 52px; font-weight: 600; color: #00FF88; letter-spacing: 14px; margin-bottom: 10px; line-height: 1;">
                                                    ${input.userInputCode}
                                                </div>
                                            </div>
                                            
                                            <p style="font-family: 'Space Grotesk', sans-serif; font-size: 12px; color: #4a5452; margin-top: 40px; max-width: 320px; margin-left: auto; margin-right: auto; line-height: 1.6;">
                                                This code was requested to access the Juvantia network. If you did not initiate this, please secure your account.
                                            </p>
                                            
                                            <div style="margin-top: 60px; border-top: 1px solid #1a1f1e; padding-top: 20px;">
                                                <p style="font-family: 'Space Grotesk', sans-serif; font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: #333d3b;">
                                                    &copy; Juvantia Foundation
                                                </p>
                                            </div>
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
                cookieDomain: ".juvantia.org",
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
