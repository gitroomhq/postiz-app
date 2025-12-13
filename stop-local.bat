@echo off
echo Stopping Postiz Docker services...

REM 停止并移除所有服务
docker-compose -f docker-compose.local.yaml down

echo.
echo All Postiz services have been stopped and removed.