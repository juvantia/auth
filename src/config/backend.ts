import Passwordless from "supertokens-node/recipe/passwordless";
import Session from "supertokens-node/recipe/session";
import { TypeInput } from "supertokens-node/types";
import Dashboard from "supertokens-node/recipe/dashboard";

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
            apiBasePath: "/api/auth",
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
                // SSO cookie domain: only set for production
                cookieDomain: (!process.env.NEXT_PUBLIC_API_DOMAIN || process.env.NEXT_PUBLIC_API_DOMAIN.includes("localhost")) 
                    ? undefined 
                    : ".juvantia.org",
                // Force cookie mode explicitly on the backend
                getTokenTransferMethod: () => "cookie",
            }),
            Dashboard.init(),
        ],
        isInServerlessEnv: true,
    };
};
