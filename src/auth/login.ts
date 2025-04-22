import { prisma } from "../prisma/client";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { JWT_SECRET } from "../utils/env";
import { loginValidation } from "./validation";

export async function loginUser(email: string, password: string) {
    const { error } = loginValidation.validate({ email, password }, { abortEarly: false });
    if (error) return { success: false, message: error.details.map(e => e.message).join(', ') };

    try {
        const user = await prisma.users.findUnique({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return { success: false, message: "Credenciais inválidas" };
        }

        const signOptions: SignOptions = {
            expiresIn: "6d"
        };

        const token = jwt.sign(
            { email: user.email, name: user.name, sub: user.id },
            JWT_SECRET as jwt.Secret,
            signOptions
        );

        return { success: true, token };
    } catch (err) {
        console.error(err);
        return { success: false, message: "Erro interno ao logar" };
    }
}
