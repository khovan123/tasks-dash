# Tasks Dash

Tasks Dash là giao diện quản lý đa dự án theo mô hình Jira, được thiết kế để tập trung tiến độ, work item, sprint, board, tài liệu và hoạt động phát triển phần mềm vào một workspace.

## Chức năng đã triển khai

- Dashboard tổng quan đa dự án, progress, trạng thái rủi ro và thành viên hiện tại.
- Sidebar liệt kê toàn bộ dự án; mỗi dự án có project key duy nhất như `STK`, `FWM`, `SSW`.
- Work item theo metadata kiểu Jira: type, status, priority, assignee, story point, sprint, module, due date, PR.
- Module hoạt động như Epic: gom work item và theo dõi tiến độ theo nhóm chức năng.
- Board kéo-thả, sprint hiện tại, backlog và danh sách sprint.
- Workflow/automation builder với trigger, condition và action.
- Liên kết GitHub repository, pull request, Google Drive folder và Discord channel theo dự án.
- Docs explorer mô phỏng cây thư mục Google Drive đã filter theo từng dự án.
- Báo cáo throughput, completion rate, velocity, workload và pull request.
- Quản lý thành viên và vai trò workspace.
- Tạo project, work item và mời thành viên; dữ liệu demo được lưu bằng `localStorage`.
- Giao diện responsive cho desktop, tablet và mobile.

## Chạy dự án

Đây là static web app không cần build:

```bash
python3 -m http.server 8080
```

Mở `http://localhost:8080`.

Có thể dùng extension Live Server hoặc deploy trực tiếp lên GitHub Pages, Netlify, Vercel.

## Tích hợp thật

Giao diện đã chuẩn bị sẵn vị trí và trạng thái kết nối. Để đồng bộ dữ liệu thật cần bổ sung backend hoặc serverless API cho:

1. **GitHub App/OAuth**: repository, issue, pull request, webhook.
2. **Google OAuth + Drive API**: folder picker, folder tree và file permissions.
3. **Discord webhook/bot**: gửi thông báo theo automation.
4. **Database**: lưu workspace, role, project, workflow, sprint và work item.
5. **Job/automation worker**: xử lý trigger theo lịch và webhook.

## Cấu trúc

```text
.
├── index.html    # Toàn bộ screen và modal
├── styles.css    # Design system, layout và responsive
├── app.js        # Dữ liệu, navigation, CRUD demo, drag/drop, filter
└── README.md
```
