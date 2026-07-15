import { request } from "@/http/request"

export interface LoginRequest {
  username: string
  loginType: "CODE" | "PASSWORD"
  password?: string
  code?: string
}

export interface LoginResult {
  token: string
  id?: string
  name?: string
  phone?: string
  email?: string
  companyId?: string
  menuCodes?: string[]
}

export function loginApi(data: LoginRequest) {
  return request<LoginResult>({
    url: "/api/user/login/admin",
    method: "post",
    data
  })
}

export function sendLoginCodeApi(account: string) {
  const isEmail = account.includes("@")
  return request<void>({
    url: "/api/user/sms/code",
    method: "post",
    data: {
      email: isEmail ? account : undefined,
      phone: isEmail ? undefined : account,
      verifyType: isEmail ? 2 : 1,
      codeType: 0
    }
  })
}
