"use strict";
(() => {
  const base = "https://ohwkywomdqgcnptsnhwk.supabase.co";
  const key = "sb_publishable_tNSrR-mJYeChyS1J_5Ykkg_oH15pvXd";
  const page = location.origin + location.pathname;
  const requestSection = document.getElementById("request-section");
  const changeSection = document.getElementById("change-section");
  const status = document.getElementById("status");
  const requestButton = document.getElementById("request");
  const changeButton = document.getElementById("change");
  const fragment = new URLSearchParams(location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(location.search);
  let bearer = "";
  let refresh = "";
  const setStatus = (message, type = "") => {
    status.textContent = message;
    status.className = type;
  };
  const scrubUrl = () => history.replaceState(null, "", page);
  async function authFetch(path, options = {}) {
    const response = await fetch(base + path, {
      method: options.method || "GET",
      headers: {
        apikey: key,
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: "Bearer " + options.token } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
      referrerPolicy: "no-referrer",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.msg || payload.error_description || payload.message || payload.error || "요청 처리에 실패했습니다.");
    return payload;
  }
  // Read recovery credentials only from the Supabase redirect, keep them in memory,
  // and immediately discard URL fragments to avoid accidental leaks via copies/history.
  const type = fragment.get("type") || query.get("type");
  const error = fragment.get("error_description") || query.get("error_description");
  bearer = fragment.get("access_token") || "";
  refresh = fragment.get("refresh_token") || "";
  const code = query.get("code");
  scrubUrl();
  function enableEmailFlow(message) {
    requestSection.classList.remove("hidden");
    changeSection.classList.add("hidden");
    setStatus(message, "error");
  }
  async function start() {
    if (error) return enableEmailFlow("복구 링크가 만료되었거나 유효하지 않습니다. 새 이메일을 요청하세요.");
    if (type !== "recovery" || !bearer) {
      // Supabase PKCE callback is not used by the dashboard recovery flow.
      return enableEmailFlow(code ? "인증 방식이 맞지 않습니다. 이메일 재설정을 다시 요청하세요." : "재설정 링크가 없습니다. 새 이메일을 요청하세요.");
    }
    try {
      await authFetch("/auth/v1/user", { token: bearer });
      changeSection.classList.remove("hidden");
      setStatus("인증 링크 확인 완료. 새 비밀번호를 입력하세요.", "ok");
    } catch {
      bearer = "";
      refresh = "";
      enableEmailFlow("복구 링크가 만료되었거나 유효하지 않습니다. 새 이메일을 요청하세요.");
    }
  }
  requestButton.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim().toLowerCase();
    if (!email || !document.getElementById("email").checkValidity()) return setStatus("올바른 이메일 주소를 입력하세요.", "error");
    requestButton.disabled = true;
    setStatus("이메일 전송 요청 중…");
    try {
      // Supabase requires page to be allowlisted in Auth URL Configuration.
      await authFetch("/auth/v1/recover?redirect_to=" + encodeURIComponent(page), { method: "POST", body: { email } });
      setStatus("재설정 이메일을 요청했습니다. 받은편지함을 확인하세요. 메일이 오지 않으면 잠시 후 다시 확인하세요.", "ok");
    } catch {
      setStatus("이메일 요청에 실패했습니다. Supabase 인증 설정과 메일 발송 제한을 확인하세요.", "error");
    } finally { requestButton.disabled = false; }
  });
  changeButton.addEventListener("click", async () => {
    const p = document.getElementById("password").value;
    const confirmation = document.getElementById("confirm").value;
    if (p.length < 12 || !/[A-Z]/.test(p) || !/[a-z]/.test(p) || !/[0-9]/.test(p) || !/[^A-Za-z0-9]/.test(p)) return setStatus("12자 이상, 대문자·소문자·숫자·특수문자를 모두 포함하세요.", "error");
    if (p !== confirmation) return setStatus("두 비밀번호가 일치하지 않습니다.", "error");
    changeButton.disabled = true;
    setStatus("비밀번호 변경 중…");
    try {
      await authFetch("/auth/v1/user", { method: "PUT", token: bearer, body: { password: p } });
      await authFetch("/auth/v1/logout", { method: "POST", token: bearer }).catch(() => {});
      bearer = "";
      refresh = "";
      document.getElementById("password").value = "";
      document.getElementById("confirm").value = "";
      changeSection.classList.add("hidden");
      setStatus("비밀번호 변경 완료. 새 비밀번호로 로그인할 수 있습니다.", "ok");
    } catch {
      setStatus("변경하지 못했습니다. 링크가 만료됐을 수 있으니 재설정 이메일을 새로 요청하세요.", "error");
    } finally { changeButton.disabled = false; }
  });
  start();
})();