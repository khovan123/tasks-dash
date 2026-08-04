export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const valid = Boolean(token && token.length >= 20 && token.length <= 256);
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand-mark">TD</div>
        <span className="eyebrow">WORKSPACE INVITATION</span>
        <h1>Tham gia Tasks Dash</h1>
        <p>{valid ? "Đăng nhập bằng GitHub có email đã được mời. Lời mời chỉ được sử dụng một lần." : "Link lời mời không hợp lệ hoặc đã bị cắt mất token."}</p>
        {valid ? <a className="primary link-button" href={`/api/auth/github/login?invite=${encodeURIComponent(token!)}`}>Tiếp tục với GitHub</a> : null}
        <small>Email GitHub đã xác minh phải trùng chính xác với email trong lời mời.</small>
      </section>
    </main>
  );
}
