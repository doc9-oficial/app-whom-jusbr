import docgo from "docgo-sdk";
import { obterSessao } from "./utils";

interface BuscaParams {
  pesquisarPor: "PROCESSO" | "CPF" | "CNPJ" | "OAB";
  valor: string;
}

async function buscarProcessos(params: BuscaParams): Promise<void> {
  try {
    if (
      Array.isArray(params) &&
      params.length === 1 &&
      typeof params[0] === "object"
    ) {
      params = params[0];
    }

    if (!params.pesquisarPor || !params.valor) {
      console.log(
        docgo.result(
          false,
          null,
          "parâmetros pesquisarPor e valor são obrigatórios"
        )
      );
      return;
    }

    const whomExtensionId = docgo.getEnv("whomExtensionId");
    if (!whomExtensionId) {
      console.log(docgo.result(false, null, "whomExtensionId vazio"));
      return;
    }

    const whomToken = docgo.getEnv("whomToken");
    if (!whomToken) {
      console.log(docgo.result(false, null, "whomToken vazio"));
      return;
    }

    const accessToken = await obterSessao(whomExtensionId, whomToken);
    if (!accessToken) {
      console.log(docgo.result(false, null, "Falha ao obter sessão"));
      return;
    }

    const pdpjUrlBase = "https://portaldeservicos.pdpj.jus.br/api/v2/processos";
    const queryParams = new URLSearchParams();
    switch (params.pesquisarPor) {
      case "PROCESSO":
        queryParams.append("numeroProcesso", params.valor);
        break;
      case "CPF":
      case "CNPJ":
        queryParams.append("cpfCnpjParte", params.valor);
        break;
      case "OAB":
        queryParams.append("oabRepresentante", params.valor);
        break;
      default:
        console.log(
          docgo.result(false, null, "parâmetro pesquisarPor inválido")
        );
        return;
    }
    const url = `${pdpjUrlBase}?${queryParams.toString()}`;

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Referer: "https://portaldeservicos.pdpj.jus.br/consulta",
      Accept: "application/json, text/plain, */*",
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    };
    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      console.log(
        docgo.result(
          false,
          null,
          `Falha HTTP ${resp.status} ao buscar processos`
        )
      );
      return;
    }
    const data = await resp.json();

    console.log(docgo.result(true, data, null));
    return;
  } catch {
    console.log(docgo.result(false, null, "Erro ao buscar processos"));
    return;
  }
}

export default buscarProcessos;
