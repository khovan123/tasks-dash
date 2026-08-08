export interface IssueLoginCodeResponse {
  code: string;
  expiresAt: string;
}

export interface RedeemLoginCodeResponse {
  redirectUrl: string;
}
