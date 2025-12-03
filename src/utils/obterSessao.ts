async function requestLoginFromWhom(
  whomToken: string,
  whomExtensionId: string
) {
  const url = "https://cloud.doc9.com.br/api/auth/";
  const jsonData = {
    token: whomToken,
    extension_id: whomExtensionId,
  };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
      },
      body: JSON.stringify(jsonData),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await resp.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function requestSessionFromWhom(
  data: any,
  whomToken: string,
  whomExtensionId: string
) {
  const requestId = data.data?.request_id;
  if (!requestId) {
    return null;
  }

  const url = "https://cloud.doc9.com.br/api/auth/";
  const queryParams = new URLSearchParams({
    request_id: requestId,
    extension_id: whomExtensionId,
  });

  for (let i = 0; i < 10; i++) {
    const resp = await fetch(`${url}?${queryParams}`, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
      },
    });
    const sessionData = await resp.json();

    if (
      sessionData.description === "session" &&
      sessionData.data?.cookies != null
    ) {
      return sessionData;
    }

    await new Promise((resolve) => setTimeout(resolve, 6000));
  }

  return null;
}

async function getSsoJusBr(cookieHeader: string): Promise<string | null> {
  const url =
    "https://sso.cloud.pje.jus.br/auth/realms/pje/protocol/openid-connect/auth";
  const params = new URLSearchParams({
    client_id: "portalexterno-frontend",
    redirect_uri: "https://portaldeservicos.pdpj.jus.br/consulta",
    state: "f040e051-a603-46ca-8770-5529ee68aed6",
    response_mode: "fragment",
    response_type: "code",
    scope: "openid",
    nonce: "6dfc2e6f-30f9-440d-9be3-db9c018e40fb",
    prompt: "none",
  });

  const resp = await fetch(`${url}?${params}`, {
    method: "GET",
    headers: {
      Cookie: cookieHeader,
    },
    redirect: "manual",
  });

  if (resp.status >= 300 && resp.status < 400) {
    return resp.headers.get("location");
  }

  return null;
}

async function getAccessToken(
  cookieHeader: string,
  location: string
): Promise<string | null> {
  const code = location
    .split("#")[1]
    ?.split("&")
    .find((p) => p.startsWith("code="))
    ?.split("=")[1];
  if (!code) {
    return null;
  }

  const url =
    "https://sso.cloud.pje.jus.br/auth/realms/pje/protocol/openid-connect/token";
  const headers = {
    accept: "*/*",
    "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "content-type": "application/x-www-form-urlencoded",
    origin: "https://portaldeservicos.pdpj.jus.br",
    priority: "u=1, i",
    referer: "https://portaldeservicos.pdpj.jus.br/",
    "sec-ch-ua":
      '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "cross-site",
    "sec-fetch-storage-access": "active",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    Cookie: cookieHeader,
  };

  const data = new URLSearchParams({
    code: code,
    grant_type: "authorization_code",
    client_id: "portalexterno-frontend",
    redirect_uri: "https://portaldeservicos.pdpj.jus.br/consulta",
  });

  const resp = await fetch(url, {
    method: "POST",
    headers: headers,
    body: data,
  });

  const tokenData = await resp.json();
  return tokenData.access_token || null;
}

async function obterSessao(
  whomExtensionId: string,
  whomToken: string
): Promise<string | null> {
  try {
    const data = await requestLoginFromWhom(whomToken, whomExtensionId);
    if (!data.data?.request_id) {
      return null;
    }

    const session = await requestSessionFromWhom(
      data,
      whomToken,
      whomExtensionId
    );
    if (!session) {
      return null;
    }

    const cookies = session.data.cookies;
    const cookieHeader = cookies
      .filter((c: any) => c.domain && (c.domain.includes('jus.br') || c.domain.includes('keycloak')))
      .map((c: any) => `${c.name}=${c.value}`)
      .join("; ");

    const location = await getSsoJusBr(cookieHeader);
    if (!location) {
      return null;
    }

    const accessToken = await getAccessToken(cookieHeader, location);
    if (!accessToken) {
      return null;
    }

    return accessToken;
  } catch (error: any) {
    return null;
  }
}

export default obterSessao;
