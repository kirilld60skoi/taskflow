
После полного закрытия запускайте так.

Запустите базу:
docker start taskflow-postgres
В первом PowerShell запустите сервер:
cd "C:\Users\Kirill\Documents\Codex\2026-04-17-mvp-taskflow-mvp-taskflow-trello-react\server"
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/taskflow"
$env:JWT_ACCESS_SECRET="change-me-access"
$env:JWT_REFRESH_SECRET="change-me-refresh"
$env:CLIENT_URL="http://localhost:3000"
$env:PORT="5000"
npm run dev
Во втором PowerShell запустите фронт:
cd "C:\Users\Kirill\Documents\Codex\2026-04-17-mvp-taskflow-mvp-taskflow-trello-react\client"
$env:VITE_API_URL="http://localhost:5000/api"
npm run dev -- --host 0.0.0.0 --port 3000
Откройте сайт:
http://localhost:3000
Проверка:

API: http://localhost:5000/api/health