import Passwordless from "supertokens-node/recipe/passwordless";
import Session from "supertokens-node/recipe/session";
import { TypeInput } from "supertokens-node/types";
import Dashboard from "supertokens-node/recipe/dashboard";
import JWT from "supertokens-node/recipe/jwt";
import supertokens from "supertokens-node";
import { query } from "../lib/db";

export const backendConfig = (): TypeInput => {
    return {
        framework: "custom",
        supertokens: {
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
                                    secure: Number(process.env.SMTP_PORT) === 465,
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
                                        <div style="background-color: #0b0d0c; margin: 0; padding: 0; min-height: 100vh;">
                                            <div style="background-color: #111414; background-image: radial-gradient(#1a1f1e 1px, transparent 1px); background-size: 20px 20px; color: #fff; padding: 80px 20px; text-align: center; max-width: 600px; margin: auto; border-left: 1px solid #1a1f1e; border-right: 1px solid #1a1f1e; min-height: 400px;">
                                                <style>
                                                    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600&display=swap');
                                                </style>
                                                
                                                <p style="font-family: 'Space Grotesk', sans-serif; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3em; color: #4a5452; margin-bottom: 60px;">
                                                    Identity Verification
                                                </p>
                                                
                                                <div style="margin: 40px 0;">
                                                    <div style="font-family: 'Space Grotesk', sans-serif; font-size: 48px; font-weight: 600; color: #00FF88; letter-spacing: 12px; line-height: 1; text-shadow: 0 0 20px rgba(0, 255, 136, 0.2);">
                                                        ${input.userInputCode}
                                                    </div>
                                                </div>
                                                
                                                <p style="font-family: 'Space Grotesk', sans-serif; font-size: 13px; color: #66706e; margin-top: 60px; max-width: 300px; margin-left: auto; margin-right: auto; line-height: 1.6;">
                                                    Enter this code in the Juvantia Auth interface to complete your session start.
                                                </p>
                                                
                                                <div style="margin-top: 100px; border-top: 1px solid #1a1f1e; padding-top: 30px;">
                                                    <p style="font-family: 'Space Grotesk', sans-serif; font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: #2a312f;">
                                                        &copy; Juvantia Foundation
                                                    </p>
                                                </div>
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
                getTokenTransferMethod: () => "any",
                antiCsrf: "NONE",
                exposeAccessTokenToFrontendInCookieBasedAuth: true,
                override: {
                    functions: (originalImplementation) => {
                        return {
                            ...originalImplementation,
                            createNewSession: async function (input) {
                                let email = undefined;
                                let name = undefined;
                                let username = undefined;
                                let avatar_url = undefined;

                                try {
                                    const user = await supertokens.getUser(input.userId);
                                    if (user && user.emails && user.emails.length > 0) {
                                        email = user.emails[0];
                                    }

                                    // Fetch profile from PostgreSQL
                                    const result = await query("SELECT name, username, avatar_url FROM users WHERE supertokens_id = $1", [input.userId]);
                                    if (result.rows.length > 0) {
                                        name = result.rows[0].name;
                                        username = result.rows[0].username;
                                        avatar_url = result.rows[0].avatar_url;
                                    }
                                } catch (err) {
                                    console.error("Juvantia Auth: Error fetching user in createNewSession", err);
                                }

                                input.accessTokenPayload = {
                                    ...input.accessTokenPayload,
                                    name,
                                    username
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
