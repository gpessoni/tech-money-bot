import { ExpenseCategory, IncomeType } from "@prisma/client";
import { loginUser } from "../auth/login";
import { prisma } from "../prisma/client";
import { setUserState, getUserState, clearUserState } from "./conversationState";
import jwt from "jsonwebtoken";

const tiposEntrada = {
    SALARY: "Salário",
    FREELANCE: "Freelancer", 
    INVESTMENT: "Investimento",
    RENT: "Aluguel",
    OTHER: "Outro",
};

const tiposInvestimento = {
    CDB: "CDB",
    ACOES: "Ações",
    TESOURO: "Tesouro Direto",
    FII: "Fundos Imobiliários"
};

const tiposSaida = {
    ALIMENTACAO: "Alimentação",
    TRANSPORTE: "Transporte",
    SAUDE: "Saúde", 
    EDUCACAO: "Educação",
    MORADIA: "Moradia",
    LAZER: "Lazer",
    VESTUARIO: "Vestuário",
    SERVICOS: "Serviços",
    IMPOSTOS: "Impostos",
    SEGUROS: "Seguros",
    PRESENTES: "Presentes",
    VIAGENS: "Viagens",
    OUTROS: "Outros"
};

const tiposReverso = Object.fromEntries(
    Object.entries(tiposEntrada).map(([key, value]) => [value.toLowerCase(), key])
);

const tiposInvestimentoReverso = Object.fromEntries(
    Object.entries(tiposInvestimento).map(([key, value]) => [value.toLowerCase(), key])
);

const tiposSaidaReverso = Object.fromEntries(
    Object.entries(tiposSaida).map(([key, value]) => [value.toLowerCase(), key])
);

const userTokens: Record<string, string> = {};

export async function processarMensagem(client: any, msg: any) {
    const texto = msg.body.trim();
    const chatId = msg.from;

    if (msg.from !== '5516999980213@c.us') {
        console.log('Mensagem de número desconhecido ignorada');
        return;
    }

    if (texto.startsWith("/login")) {
        const partes = texto.split(" ");
        if (partes.length < 3) {
            return client.sendMessage(chatId, "❌ Use: /login email senha");
        }

        const email = partes[1];
        const senha = partes[2];

        const res = await loginUser(email, senha);
        if (res.success && res.token) {
            userTokens[chatId] = res.token;
            return client.sendMessage(chatId, "✅ Login realizado com sucesso!");
        } else {
            return client.sendMessage(chatId, `❌ Erro: ${res.message || "Não foi possível fazer login."}`);
        }
    }

    const token = userTokens[chatId];
    if (!token) {
        return client.sendMessage(chatId, "🔒 Você precisa estar logado. Use /login email senha");
    }

    let userId: string | null = null;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;
        userId = decoded.sub as string;
    } catch (error) {
        delete userTokens[chatId];
        return  
    }

    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user) {
        return 
    }

    // COMANDO DE INFORMAÇÕES
    if (texto.startsWith("/infos")) {
        const dataAtual = new Date();
        const primeiroDiaMes = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1);
        const ultimoDiaMes = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 0);

        // Buscar entradas do mês
        const entradas = await prisma.incomes.findMany({
            where: {
                userId: user.id,
                date: {
                    gte: primeiroDiaMes,
                    lte: ultimoDiaMes
                }
            }
        });

        // Buscar saídas do mês
        const saidas = await prisma.expense.findMany({
            where: {
                userId: user.id,
                date: {
                    gte: primeiroDiaMes,
                    lte: ultimoDiaMes
                }
            }
        });

        // Buscar investimentos
        const investimentos = await prisma.investment.findMany({
            where: {
                userId: user.id
            }
        });

        const totalEntradas = entradas.reduce((acc, entrada) => acc + entrada.amount, 0);
        const totalSaidas = saidas.reduce((acc, saida) => acc + saida.amount, 0);
        const totalInvestimentos = investimentos.reduce((acc, inv) => acc + inv.amount, 0);
        const saldoMes = totalEntradas - totalSaidas;

        let mensagem = "📊 *BALANÇO DO MÊS*\n\n";
        mensagem += `📅 Período: ${primeiroDiaMes.toLocaleDateString()} a ${ultimoDiaMes.toLocaleDateString()}\n\n`;
        mensagem += `💰 Total de Entradas: R$ ${totalEntradas.toFixed(2)}\n`;
        mensagem += `💸 Total de Saídas: R$ ${totalSaidas.toFixed(2)}\n`;
        mensagem += `📈 Saldo do Mês: R$ ${saldoMes.toFixed(2)}\n`;
        mensagem += `💹 Percentual Gasto: ${((totalSaidas/totalEntradas) * 100).toFixed(1)}%\n\n`;
        mensagem += `🏦 Total em Investimentos: R$ ${totalInvestimentos.toFixed(2)}\n`;
        mensagem += `📊 Percentual Investido: ${((totalInvestimentos/totalEntradas) * 100).toFixed(1)}%\n\n`;

        // Detalhamento por categoria de entrada
        mensagem += "*Entradas por Tipo:*\n";
        const entradasPorTipo = entradas.reduce((acc: any, entrada) => {
            acc[entrada.type] = (acc[entrada.type] || 0) + entrada.amount;
            return acc;
        }, {});

        Object.entries(entradasPorTipo).forEach(([tipo, valor]) => {
            const percentual = ((valor as number)/totalEntradas * 100).toFixed(1);
            mensagem += `${tiposEntrada[tipo as keyof typeof tiposEntrada]}: R$ ${(valor as number).toFixed(2)} (${percentual}%)\n`;
        });
        mensagem += "\n";

        // Detalhamento por categoria de saída
        mensagem += "*Gastos por Categoria:*\n";
        const gastosPorCategoria = saidas.reduce((acc: any, saida) => {
            acc[saida.category] = (acc[saida.category] || 0) + saida.amount;
            return acc;
        }, {});

        Object.entries(gastosPorCategoria).forEach(([categoria, valor]) => {
            const percentual = ((valor as number)/totalSaidas * 100).toFixed(1);
            mensagem += `${tiposSaida[categoria as keyof typeof tiposSaida]}: R$ ${(valor as number).toFixed(2)} (${percentual}%)\n`;
        });
        mensagem += "\n";

        // Detalhamento dos investimentos
        mensagem += "*Investimentos por Tipo:*\n";
        const investimentosPorTipo = investimentos.reduce((acc: any, inv) => {
            acc[inv.category] = (acc[inv.category] || 0) + inv.amount;
            return acc;
        }, {});

        Object.entries(investimentosPorTipo).forEach(([tipo, valor]) => {
            const percentual = ((valor as number)/totalInvestimentos * 100).toFixed(1);
            mensagem += `${tiposInvestimento[tipo as keyof typeof tiposInvestimento]}: R$ ${(valor as number).toFixed(2)} (${percentual}%)\n`;
        });

        return client.sendMessage(chatId, mensagem);
    }

    // FLUXO DE ENTRADA
    if (texto.startsWith("/entrada")) {
        const userState = getUserState(chatId);

        const partes = texto.split(" ");
        if (partes.length < 4) {
            return 
        }

        const tipo = partes[1];
        const valor = parseFloat(partes[2].replace(",", "."));
        const descricao = partes.slice(3).join(" ");

        const tipoEnum = tiposReverso[tipo.toLowerCase()];

        if (!tipoEnum) {
            return client.sendMessage(chatId, "❌ Tipo de entrada inválido. Use um dos tipos: " + Object.values(tiposEntrada).join(", "));
        }

        if (isNaN(valor) || valor <= 0) {
            return client.sendMessage(chatId, "❌ Valor inválido. Digite um número positivo.");
        }

        if (!descricao) {
            return client.sendMessage(chatId, "❌ Descrição é obrigatória.");
        }

        await prisma.incomes.create({
            data: {
                type: tipoEnum as IncomeType,
                amount: valor,
                description: descricao,
                userId: user.id,
            },
        });

        return client.sendMessage(chatId, "✅ Entrada registrada com sucesso!");
    }

    // FLUXO DE SAÍDA
    if (texto.startsWith("/saida")) {
        const partes = texto.split(" ");
        if (partes.length < 4) {
            return client.sendMessage(chatId, "❌ Use: /saida [categoria] [valor] [descrição]");
        }

        const categoria = partes[1];
        const valor = parseFloat(partes[2].replace(",", "."));
        const descricao = partes.slice(3).join(" ");

        const categoriaEnum = tiposSaidaReverso[categoria.toLowerCase()];

        if (!categoriaEnum) {
            return client.sendMessage(chatId, "❌ Categoria de saída inválida. Use uma das categorias: " + Object.values(tiposSaida).join(", "));
        }

        if (isNaN(valor) || valor <= 0) {
            return client.sendMessage(chatId, "❌ Valor inválido. Digite um número positivo.");
        }

        if (!descricao) {
            return client.sendMessage(chatId, "❌ Descrição é obrigatória.");
        }

        await prisma.expense.create({
            data: {
                category: categoriaEnum as ExpenseCategory,
                amount: valor,
                description: descricao,
                userId: user.id,
            },
        });

        return client.sendMessage(chatId, "✅ Saída registrada com sucesso!");
    }

    // FLUXO DE INVESTIMENTO
    if (texto.startsWith("/investimento")) {
        console.log("investimento")
        const partes = texto.split(" ");
        if (partes.length < 5) {
            return client.sendMessage(chatId, "❌ Use: /investimento [categoria] [nome] [valor] [rendimento]");
        }

        const categoria = partes[1];
        const nome = partes[2];
        const valor = parseFloat(partes[3].replace(",", "."));
        const rendimento = parseFloat(partes[4].replace(",", "."));

        const categoriaEnum = tiposInvestimentoReverso[categoria.toLowerCase()];

        if (!categoriaEnum) {
            return client.sendMessage(chatId, "❌ Categoria de investimento inválida. Use uma das categorias: " + Object.values(tiposInvestimento).join(", "));
        }

        if (isNaN(valor) || valor <= 0) {
            return client.sendMessage(chatId, "❌ Valor inválido. Digite um número positivo.");
        }

        if (isNaN(rendimento)) {
            return client.sendMessage(chatId, "❌ Rendimento inválido. Digite um número.");
        }

        await prisma.investment.create({
            data: {
                category: categoriaEnum,
                name: nome,
                amount: valor,
                yield: rendimento,
                userId: user.id,
            },
        });

        return client.sendMessage(chatId, "✅ Investimento registrado com sucesso!");
    }
    
}
